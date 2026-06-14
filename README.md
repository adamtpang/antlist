# 8020.best

AI task prioritizer built on the Pareto principle — dump your tasks, let AI sort them into priority tiers, and focus on the vital 20% that drives 80% of the results.

Live at **[8020.best](https://8020.best)**.

## Problem
When you have a pile of unstructured tasks (from notes, files, or brain dumps), you need a fast way to triage them by importance and act on what actually matters.

## What It Does
- Drag-and-drop a file **or paste tasks directly**; uses AI (Anthropic Claude) to sort them into priority tiers (S → F).
- Drag folders between tiers, then **view, copy, or export** a clean priority-ordered markdown list — so you do the important, urgent things first.
- "Deconstructor" view breaks big tasks into recursive subtask trees with completion tracking.
- Persists data locally via IndexedDB; supports markdown and ZIP export/import (re-importing preserves your tiers).

## Tech Stack
Next.js 15, TypeScript, Anthropic Claude API (`@anthropic-ai/sdk`), IndexedDB (idb-keyval), JSZip, Tailwind CSS.
