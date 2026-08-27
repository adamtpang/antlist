import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "8020.best Support",
  description:
    "Get help with 8020.best task sorting, browser storage, imports, exports, AI requests, and the 8020 Chrome extension.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <main className="trust-page">
      <h1>8020.best support</h1>
      <p>
        8020.best keeps its working library in local browser or extension storage. Start troubleshooting by preserving a Markdown or ZIP export, recording the product version, and noting the exact action and error message without sharing private tasks or saved URLs.
      </p>

      <h2>A task list disappeared</h2>
      <p>
        The web app stores its task library in IndexedDB for the current browser profile. Clearing site data, using private browsing, changing profiles, or moving to another device can produce an empty library. Restore a prior 8020 Markdown or ZIP export when one is available.
      </p>

      <h2>AI sorting is unavailable</h2>
      <p>
        Web sorting requires a successful connection to the 8020.best API and Anthropic. The Chrome extension&apos;s AI actions additionally require its separately installed local companion and optional native-messaging permission. Manual prioritization, local organization, exports, and restores remain separate from those AI requests.
      </p>

      <h2>A saved tab did not open</h2>
      <p>
        The Chrome extension keeps a saved record when Chrome cannot open its URL. Try copying the URL, checking whether Chrome blocks the scheme or destination, and restoring again. Removed collections and tabs remain recoverable from Trash until they are permanently deleted.
      </p>

      <h2>Request additional help</h2>
      <p>
        Use the <Link href="/contact">contact page</Link> for current public support routes. Technical defects can use the public GitHub issue tracker, but reports must exclude private task text, browsing history, tokens, credentials, personal communications, and confidential documents.
      </p>
    </main>
  );
}
