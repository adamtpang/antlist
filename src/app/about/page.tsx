import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About 8020.best",
  description:
    "Learn how the 8020 Chrome extension saves, prioritizes, and restores tabs locally, plus who builds and operates the product.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="trust-page">
      <h1>About 8020.best</h1>
      <p>
        8020 is a free, local-first Chrome extension built around a simple Pareto principle: a small share of open work often creates most of the useful result. The extension turns crowded browser windows into searchable collections, then keeps the highest-leverage saved tabs visible through S-to-F priorities, a Quick list, task state, and the Your 20% focus queue.
      </p>

      <h2>What the product does</h2>
      <p>
        8020 saves the current window, every window, selected tabs, or the tabs beside the current one. It restores individual tabs or complete collections, preserves Chrome tab-group names and colors, searches titles and URLs, and keeps common cleanup mistakes recoverable through Trash and Undo. The working library stays in chrome.storage.local without an 8020 account.
      </p>
      <p>
        Optional AI triage requires a separately installed local companion, a Chrome permission granted at runtime, and a user-started action. Saving, search, collections, priorities, Quick list, task state, import, export, Trash, and restoration work without AI. The original web task prioritizer remains available as a separate tool for people who need to rank a pasted task list.
      </p>

      <h2>Who operates 8020.best</h2>
      <p>
        8020.best is built by <a href="https://adampang.com">Adam Pangelinan</a> and operated through <a href="https://anchormarianas.com">Anchor Marianas LLC</a>. Source code for the extension is available in the public <a href="https://github.com/adamtpang/8020.best">8020.best repository</a> for technical inspection and issue reporting.
      </p>

      <h2>Where to go next</h2>
      <p>
        Read the <Link href="/privacy">privacy policy</Link> before enabling optional AI, use the <Link href="/support">support guide</Link> for extension help, return to the <Link href="/">extension overview</Link>, or open the original <Link href="/tasks">task prioritizer</Link> when a pasted task list needs its own priority pass.
      </p>
    </main>
  );
}
