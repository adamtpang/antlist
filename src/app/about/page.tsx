import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About 8020.best",
  description:
    "Learn what 8020.best does, how its local-first task workflow operates, and who builds and operates the service.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="trust-page">
      <h1>About 8020.best</h1>
      <p>
        8020.best is a free task prioritizer built around a simple Pareto principle: a small share of available work often creates most of the useful result. The web app turns pasted or uploaded task lists into visible priority tiers, then lets each person review, move, complete, export, and restore that structure.
      </p>

      <h2>What the product does</h2>
      <p>
        The main workflow accepts plain text, Markdown, and ZIP files. New lists can be grouped with Anthropic Claude after the user explicitly requests sorting. Existing 8020 exports can be restored without another AI request, and the resulting task library is stored in the browser through IndexedDB.
      </p>
      <p>
        A separate deconstructor can break a large task into a small milestone tree. The Chrome extension is another 8020 interface focused on saving, organizing, prioritizing, and restoring browser tabs. Both products emphasize portable exports and user-controlled actions instead of mandatory accounts.
      </p>

      <h2>Who operates 8020.best</h2>
      <p>
        8020.best is built by <a href="https://adampang.com">Adam Pangelinan</a> and operated through <a href="https://anchormarianas.com">Anchor Marianas LLC</a>. Source code for the web app is available in the public <a href="https://github.com/adamtpang/8020.best">8020.best repository</a> for technical inspection and issue reporting.
      </p>

      <h2>Where to go next</h2>
      <p>
        Read the <Link href="/privacy">privacy policy</Link> before submitting sensitive task text, use the <Link href="/support">support guide</Link> for product help, or return to the <Link href="/">task prioritizer</Link> to start with a task dump.
      </p>
    </main>
  );
}
