import Image from "next/image";
import Link from "next/link";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/hjnoblncmfgibmkbappbndbledimmkme";

const priorities = [
  ["S", "Act today", "Time-sensitive work where waiting creates a real cost."],
  ["A", "Advance next", "Work that directly moves a current high-priority goal."],
  ["B", "Support active work", "Useful tasks and references that are not the current lever."],
  ["C", "Consider later", "Interesting or potentially useful, but optional right now."],
  ["D", "Defer freely", "Low-leverage, duplicated, stale, or easy to find again."],
  ["F", "Forget", "Distractions and irrelevant work that are safe to lose."],
];

export default function Home() {
  return (
    <main className="extension-landing">
      <header className="marketing-nav">
        <Link className="brand-lockup" href="/" aria-label="8020 home">
          <Image src="/extension-icon.png" alt="" width={32} height={32} priority />
          <span>8020</span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#priority">Priority system</a>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <a className="nav-install" href={CHROME_STORE_URL}>
          Get 8020
        </a>
      </header>

      <section className="extension-hero" aria-labelledby="extension-title">
        <div className="hero-copy">
          <span className="eyebrow">Local-first Chrome extension</span>
          <h1 id="extension-title">Your important tabs, first.</h1>
          <p>
            8020 turns a crowded browser into a clear, recoverable priority system. Save tabs into collections, find anything quickly, restore exactly what you need, and keep the three highest-leverage items visible in a focused Your 20% queue.
          </p>
          <div className="hero-actions">
            <a className="install-button" href={CHROME_STORE_URL}>
              Get 8020 for Chrome <span aria-hidden="true">↗</span>
            </a>
            <a className="text-button" href="#how-it-works">
              See how it works
            </a>
          </div>
          <ul className="extension-facts" aria-label="Product facts">
            <li>Free · $0</li>
            <li>No account</li>
            <li>Saved locally</li>
            <li>Optional AI</li>
          </ul>
        </div>

        <div className="hero-product" aria-label="8020 extension preview">
          <div className="window-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <b>8020 · Priority Tabs</b>
          </div>
          <Image
            src="/extension-library.png"
            alt="8020 extension showing the Your 20% focus queue, collections, and S-to-F priority tiers"
            width={1280}
            height={800}
            sizes="(max-width: 900px) 94vw, 58vw"
            priority
          />
        </div>
      </section>

      <section className="proof-strip" aria-label="Core product promise">
        <span>OneTab-style saving</span>
        <span aria-hidden="true">+</span>
        <span>real collections</span>
        <span aria-hidden="true">+</span>
        <span>priority that stays visible</span>
      </section>

      <section id="features" className="marketing-section">
        <div className="section-heading">
          <span className="eyebrow">Built for the tabs you mean to return to</span>
          <h2>A library, not a tab graveyard.</h2>
          <p>
            8020 keeps the speed people expect from a tab saver while adding the structure needed to make saved tabs useful later. Every core action works without an account, advertising, analytics, or mandatory AI.
          </p>
        </div>
        <div className="feature-grid">
          <div>
            <span className="feature-number">01</span>
            <h3>Save without losing work</h3>
            <p>
              Save the current window, every window, selected tabs, or the tabs beside the current one. 8020 persists each record before closing its source tab, preserves Chrome group names and colors, and removes a saved record only after restoration succeeds.
            </p>
          </div>
          <div>
            <span className="feature-number">02</span>
            <h3>Find the vital few</h3>
            <p>
              Rank collections and tabs from S through F, star a Quick list, and mark lightweight tasks as todo or done. The Your 20% queue combines those signals to surface the three saved tabs most likely to matter now.
            </p>
          </div>
          <div>
            <span className="feature-number">03</span>
            <h3>Keep control of the library</h3>
            <p>
              Search titles, URLs, collections, and Chrome groups from the library or the address bar with keyword 80. Merge, archive, share, import, and export collections, while Trash and Undo keep common cleanup mistakes recoverable.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="workflow-section">
        <div className="section-heading compact">
          <span className="eyebrow">A calmer browser in three moves</span>
          <h2>Save. Prioritize. Return.</h2>
        </div>
        <ol className="workflow-list">
          <li>
            <span>1</span>
            <div>
              <h3>Capture the open loop</h3>
              <p>
                Choose Save window from the 8020 library, use a keyboard shortcut, or save a precise group from Chrome’s context menu. New tabs land in a recoverable Unsorted inbox instead of disappearing into an anonymous list.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Give it an honest priority</h3>
              <p>
                Move each collection into the tier that reflects its real leverage. S is reserved for work with a same-day cost, A advances a current goal, and the lower tiers make postponement or deletion explicit instead of accidental.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Restore only what matters</h3>
              <p>
                Open a single tab, selected tabs, or a complete collection when the work becomes relevant. 8020 preserves failed restores, keeps removed items in Trash, and provides portable exports so the library does not become a lock-in trap.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="priority" className="priority-section">
        <div className="priority-copy">
          <span className="eyebrow">A threshold, not a quota</span>
          <h2>Every tab earns its tier.</h2>
          <p>
            8020 publishes the complete S-to-F admission rubric inside the extension. Empty tiers are valid, and nothing is promoted merely to make the board look busy. The result is a priority system a person can inspect, correct, and trust.
          </p>
          <Image
            src="/priority-rubric.png"
            alt="8020 priority rubric explaining the S, A, B, C, D, and F tiers"
            width={1280}
            height={800}
            sizes="(max-width: 900px) 94vw, 46vw"
          />
        </div>
        <ol className="tier-list">
          {priorities.map(([tier, name, description]) => (
            <li key={tier}>
              <span className={`tier-mark tier-${tier.toLowerCase()}`}>{tier}</span>
              <div>
                <h3>{name}</h3>
                <span>{description}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="privacy-band">
        <div>
          <span className="eyebrow">Local by default</span>
          <h2>Your saved tabs stay on your device.</h2>
        </div>
        <p>
          8020 stores the working library in Chrome local storage and includes no advertising, analytics, or remote telemetry. Optional AI triage requires a separately installed local companion, an explicit permission grant, and a user-started action. Core saving, search, organization, export, and restoration never depend on AI.
        </p>
        <Link href="/privacy">Read the privacy policy</Link>
      </section>

      <section className="final-cta">
        <Image src="/extension-icon.png" alt="" width={52} height={52} />
        <h2>Close the tabs. Keep the priorities.</h2>
        <p>
          Turn today’s browser sprawl into a local, searchable library that keeps the vital few visible and everything else safely recoverable.
        </p>
        <a className="install-button light" href={CHROME_STORE_URL}>
          Get 8020 for Chrome <span aria-hidden="true">↗</span>
        </a>
        <Link className="legacy-link" href="/tasks">
          Looking for the original task prioritizer?
        </Link>
      </section>
    </main>
  );
}
