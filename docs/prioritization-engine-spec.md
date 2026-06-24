# 8020.best — Prioritization Engine Build Spec

> Paste a 4M-character inbox → get a short, ordered, do-it-now list; everything else safely archived. Built on the Pareto principle: surface the vital ~20%, archive the trivial ~80% (reversibly).

## 1. Principles (the product decisions)

| Decision | Choice | Why |
|---|---|---|
| Control model | **Hybrid** | AI does the mechanical sort; the user injects intent with ~5 taps (theme ranking). The one thing AI can't know is *what matters to you this week*. |
| Cut depth | **Hard 20% (power law)** | Surface the vital few; archive the rest. Default to a tight active list; "show more" pulls from archive. |
| Cut primitive | **Archive, not delete** | Loss aversion kills delete-based systems. Archiving is reversible, so the aggressive cut actually happens. Archive is a *resurfacing queue*, not a graveyard. |
| Priority axis | **Importance**, urgency as a tiebreaker | Everyone from Eisenhower to Jobs says importance wins; a 2nd axis doubles decision cost. |
| Within-tier order | **impact ÷ effort** (Pareto as a scheduling rule), hard deadlines pinned to top (Earliest Due Date) | Front-loads high-leverage quick wins so you actually start. |

## 2. The pipeline

```
[Paste/upload 4M chars]
        │
   (A) Segment            local, instant     → ~N items (tasks/thoughts/ideas)
        │
   (B) Dedup + pre-filter local, instant     → drop exact dups + obvious non-tasks
        │
   (C) Taxonomy pass      1–2 LLM calls       → canonical themes (~12–20), from a sample
        │
   (D) Map pass           PARALLEL LLM        → per item: {themeId, impact, effort, type, deadline?}
        │
   (E) User ranks themes  ~5 taps             → injects current intent  ← the hybrid step
        │
   (F) Cut + order        local, instant      → priority = themeRank × impact
        │                                       top 20% = ACTIVE (ordered by impact÷effort, deadlines pinned)
        │                                       bottom 80% = ARCHIVE
        │
   (G) Today view         local               → pull top 1–3 from ACTIVE
        │
   (H) Resurfacing        scheduled/on-demand → re-scan ARCHIVE for newly-urgent/relevant → offer to promote
```

**Why two LLM passes (C then D):** if every batch invents its own theme names, themes are inconsistent and unrankable. The taxonomy pass fixes a canonical theme set first; the map pass classifies *against* that fixed set — consistent **and** fully parallelizable.

**Defer the user's choice (E) to after the map (D):** themes appear fast; the user ranks; only then do we cut. (Map already produced per-item impact, so cross-theme high-impact items can still surface — the cut is `themeRank × impact`, not theme-only.)

## 3. Data model

```ts
type Item = {
  id: string;
  text: string;
  themeId: string | null;      // from map pass
  impact: number;              // 1–5  (AI)
  effort: number;              // 1–3  (AI: 1≈<15m, 2≈<2h, 3≈deep)
  type: "task" | "note" | "idea" | "reference";  // non-tasks auto-archive
  deadline: string | null;     // ISO, if detected
  state: "active" | "archived" | "done";
  promotedFrom?: "archive";    // resurfacing provenance
  source?: { line: number };   // traceability back to the raw paste
};

type Theme = { id: string; name: string; rank: number | null /* user-set */ };

type Run = {
  id: string;
  createdAt: string;
  themes: Theme[];
  items: Item[];
  cutRatio: number;            // default 0.20
  status: "segmenting" | "taxonomy" | "mapping" | "ranking" | "ready";
  progress: { done: number; total: number };  // batches
};
```

Storage: **IndexedDB** (reuse the existing `idb-keyval` setup). 4M chars + ~40K items fit comfortably. Render only the ACTIVE list + a virtualized archive (never DOM-render 40K rows).

## 4. Heavy-duty parallel processing (the core of this spec)

### 4.1 The bottleneck is OTPM, not input
4M chars ≈ **~1M input tokens**. Every item emits a small score record, so a 40K-item inbox emits **~0.7–1M output tokens**. At low API tiers, **output-tokens-per-minute (OTPM) is the gate**, not input — a Tier-1 OTPM (~10K/min, ballpark — confirm in Console → Limits) would take well over an hour. Two consequences drive the design:

1. **Compact output is mandatory** (§4.4) — keep per-item output to ~12–18 tokens.
2. **For a full 4M-char run, use the Batch API or be on Tier 3–4** (§4.6). The Batch API sidesteps interactive per-minute limits entirely.

### 4.2 Where the work runs (fits Vercel limits)
Reuse the **client-orchestrated** pattern the app already uses (browser loops over batches calling `/api/sort`). Each serverless call handles **one batch** (~2–4 s, well under Vercel's function timeout). The **browser runs a concurrency pool** and shows progress. No long-running server job needed for the real-time path.

```
Browser (orchestrator)
  ├─ pool of ~8–12 concurrent fetches
  │     each → POST /api/classify-batch  (1 batch, stateless, short)
  │              → Anthropic Haiku 4.5, structured output
  └─ writes each completed batch to IndexedDB (resumable)
```

### 4.3 Batching & concurrency
- **Batch size:** ~75–100 items/request (amortizes per-call overhead vs. output size & JSON-failure blast radius).
- **Concurrency:** start ~10 in-flight; **adaptive** — on HTTP 429 back off (the SDK already retries 429/5xx with exponential backoff; let it, and reduce pool size). Stay under tier RPM/ITPM/OTPM.
- **Anthropic tiers** scale RPM / ITPM / OTPM (Tier 1 small → Tier 4 millions of ITPM). Exact numbers: Console → Limits. Don't hardcode; read `retry-after` / `x-ratelimit-*` headers and adapt.

### 4.4 Prompt caching (big win)
The taxonomy + instructions block is **identical across every map batch** → cache it.
- `cache_control: { type: "ephemeral" }` on the system/taxonomy block. Cache **reads ≈ 0.1×** input price, writes 1.25× (5-min TTL).
- Min cacheable prefix on **Haiku 4.5 = 4096 tokens** — make the cached block (instructions + full taxonomy + few-shot) exceed that, or caching silently no-ops (`cache_creation_input_tokens: 0`).
- Continuous batch traffic keeps the 5-min cache warm; use `ttl: "1h"` only if runs have gaps.
- Keep the **volatile part (the batch's items) AFTER** the cached prefix.

### 4.5 Structured output (replace the `{` prefill)
Haiku 4.5 supports `output_config.format` with a JSON schema — guarantees parseable output, no repair logic, 24-h schema cache after first compile. Use a **terse schema** to minimize OTPM:

```jsonc
// One record per item; index maps back to batch position
{ "r": [ { "i": 0, "t": "t3", "im": 4, "ef": 1, "ty": "task", "dl": "2026-07-01" } ] }
```
`i`=index, `t`=themeId, `im`=impact, `ef`=effort, `ty`=type, `dl`=deadline|null. ~12–18 tokens/item.

### 4.6 Two run modes
| Mode | How | Latency | Cost | Use when |
|---|---|---|---|---|
| **Fast (default)** | Client-orchestrated parallel real-time calls | Minutes (tier-gated) | Full price | Interactive; small–medium inboxes; Tier 3–4 |
| **Bulk (Batch API)** | Submit all batches as one Anthropic Message Batch | Async, ~mins–1h (max 24h) | **50% off** | Huge inboxes (4M chars), cost-sensitive, low tier |

Batch API facts: ≤100K requests or 256MB/batch, 50% discount, results within ~1h typically, supports caching + structured output. Flow: `POST /v1/messages/batches` → store `batch_id` → poll `retrieve` → stream `results`. (Phase 2 — needs a background poller + a "come back when ready" UX.)

### 4.7 Resumability
Write each completed batch's results to IndexedDB keyed by a content hash of the batch. On reload/crash, skip already-done batches and resume. Show `done/total`. Essential at this scale.

### 4.8 Volume reduction before the LLM (cheaper + faster)
- **Exact-dup collapse** (normalized hash) — 4M-char inboxes of recurring thoughts have real redundancy.
- **Local pre-filter** obvious non-tasks (headers, code blocks, URLs-only, ultra-long paragraphs) → tag `type:"reference"` locally → auto-archive without spending tokens.
- *(Phase 3, scale)* swap LLM theming for **embeddings + clustering** (an embeddings provider, e.g. Voyage/OpenAI — Anthropic has no embeddings endpoint). Clustering 40K items is seconds and near-free; the LLM then only *names* clusters and scores. This is the path to 10M+ char inboxes.

## 5. Performance & cost (4M chars ≈ ~1M input tokens, ~40K items)

**Ballpark — verify with a `count_tokens` dry run; item count drives output cost.**

| | Input | Output | Cost (Haiku $1/$5) |
|---|---|---|---|
| Taxonomy (Sonnet, sample) | ~40K | ~10K | ~$0.30 |
| Map pass (Haiku) | ~1M (≈$1) | ~0.8M (≈$4) | ~$5 |
| **Total, real-time** | | | **~$5** |
| **Total, Batch API (−50%)** | | | **~$2.5** |

Caching the taxonomy prefix trims the per-call overhead further. **Throughput (real-time):** `time ≈ output_tokens / your OTPM`. ~0.8M output ÷ Tier-1 OTPM (~10K) ≈ ~80 min (too slow) → ~0.8M ÷ Tier-3 OTPM ≈ a few min. **→ For 4M chars, default to the Batch API or Tier 3–4.**

## 6. Models
- **Map/score (bulk):** `claude-haiku-4-5` — fast, cheap, supports structured output. (No `effort` param — Haiku errors on it.)
- **Taxonomy (few calls):** `claude-sonnet-4-6` for better clustering; cost negligible at low call count.
- Both overridable via `ANTHROPIC_MODEL` (already wired).

## 7. UX flow
1. **Dump** — paste/upload (exists).
2. **Processing** — progress bar (`done/total` batches), live theme chips appearing.
3. **Rank themes** — drag/tap the ~12–20 theme chips into priority order (or tap your top 3 "focus" themes). The only manual step.
4. **Active list** — top 20%, ordered, each an actionable next-step line; "⚛️ Break down" on any (exists). Draggable cut line; "show more" reveals archive.
5. **Today** — collapse to top 1–3.
6. **Archive** — searchable, virtualized; per-item "promote"; periodic "3 archived items now look relevant — promote?" prompt.

## 8. Build phases
- **Phase 1 (MVP — actually usable):** Segment → dedup → taxonomy → parallel map (structured output + caching) → theme-ranking → hard-20% cut → active/archive split → Today view. Real-time mode only. Reuses existing client-orchestration + IndexedDB. New: `/api/taxonomy`, `/api/classify-batch`; adaptive concurrency pool; theme-rank UI; archive view.
- **Phase 2 (scale + safety):** Batch API mode (50% off, async + poller); resurfacing queue; resumable runs; virtualized archive.
- **Phase 3 (huge inboxes):** embeddings + local clustering; incremental re-runs (only classify new items since last run).

## 9. Open questions / risks
- **API tier** — confirm the user's tier (Console → Limits). At 4M chars this decides real-time vs Batch.
- **Segmentation quality** — messy "thoughts/ideas" aren't clean task lines; map pass tags `type` so non-tasks auto-archive rather than polluting the active list.
- **Theme count** — too many themes makes ranking costly; cap ~12–20 and let "Other" absorb the long tail.
- **Cut isn't permanent** — 20% is a default, not dogma; the draggable line + resurfacing keep nothing truly lost.
