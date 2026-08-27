import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "8020.best Privacy Policy",
  description:
    "Read how the 8020.best web app and Chrome extension handle task text, saved tabs, local storage, optional AI requests, and service providers.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="trust-page">
      <h1>8020.best privacy policy</h1>
      <p>Last updated: August 27, 2026.</p>
      <p>
        8020.best provides a web task prioritizer and a Chrome tab-management extension. The products are designed to keep working libraries on the user&apos;s device, while optional AI actions send only the information needed to complete the action that the user requested.
      </p>

      <h2>Web app data</h2>
      <p>
        The 8020.best web app stores task folders, task text, completion state, priority tiers, and nested subtasks in the browser through IndexedDB. The app does not require an account. Export actions create Markdown or ZIP files only after the user requests the export.
      </p>
      <p>
        When a user chooses Sort tasks or requests task decomposition, the submitted task text and relevant bucket or context names are sent over HTTPS to the 8020.best server and forwarded to Anthropic Claude to generate that response. Anthropic handles the request under its own terms and privacy policy.
      </p>

      <h2>Chrome extension data</h2>
      <p>
        The 8020 Chrome extension stores saved tab titles, URLs, Chrome tab-group names and colors, collection names, priority tiers, stars, task state, archive state, Trash state, and a Markdown snapshot in chrome.storage.local on the user&apos;s device. Core save, search, organize, export, and restore features do not require an account.
      </p>
      <p>
        Optional AI triage and AI sorting require a separately installed local companion, an explicit Chrome permission grant, and a user-started action. For those actions, the companion sends tab titles and optional local priority context through the user&apos;s Claude CLI account to Anthropic. URLs and webpage body content are not included in that AI prompt.
      </p>
      <p>
        An optional filesystem mirror writes the same saved-tab Markdown snapshot to a local file chosen by the companion configuration. The mirror itself does not invoke AI or transmit the snapshot away from the device.
      </p>

      <h2>Hosting and service providers</h2>
      <p>
        Vercel hosts the public web app and processes the technical request information needed to deliver it. Anthropic processes task text only for requested AI sorting or decomposition. The current web app contains no advertising scripts or analytics trackers, and 8020.best does not sell user data.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Local web-app data can be removed by clearing the browser&apos;s site data. Local extension data can be removed by clearing extension storage or uninstalling the extension. Export a backup first if the information should be retained, and delete any optional filesystem mirror separately.
      </p>

      <h2>Limited use</h2>
      <p>
        8020.best uses and transfers user data only to provide or improve the product&apos;s user-facing task and tab-management features. User data is not used for advertising, creditworthiness, lending, or an unrelated purpose, and it is not sold to third parties.
      </p>

      <h2>Questions</h2>
      <p>
        Privacy questions can use the public routes on the <Link href="/contact">contact page</Link>. Do not include private task text, saved URLs, authentication information, or other sensitive content in a public GitHub issue.
      </p>
    </main>
  );
}
