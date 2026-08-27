import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact 8020.best",
  description:
    "Contact the operator of 8020.best for product support, security reports, privacy questions, and project information.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="trust-page">
      <h1>Contact 8020.best</h1>
      <p>
        8020.best is built by Adam Pangelinan and operated through Anchor Marianas LLC. Product questions, privacy questions, and responsible security reports should use the public contact routes maintained by the operator, which avoids publishing a private personal address in the application.
      </p>

      <h2>Product and business questions</h2>
      <p>
        Visit <a href="https://adampang.com">adampang.com</a> for Adam Pangelinan&apos;s current public contact options, or visit <a href="https://anchormarianas.com">anchormarianas.com</a> for information about Anchor Marianas LLC. Include the product name, the page involved, and a concise description of the expected outcome.
      </p>

      <h2>Technical issues</h2>
      <p>
        Reproducible web-app defects can be filed in the public <a href="https://github.com/adamtpang/8020.best/issues">GitHub issue tracker</a>. Do not include private task text, browser history, access tokens, API keys, personal communications, or other confidential information in a public issue.
      </p>

      <h2>Before contacting support</h2>
      <p>
        The <Link href="/support">support page</Link> covers local storage, exports, AI sorting, and the Chrome extension. The <Link href="/privacy">privacy policy</Link> explains which information stays on the device and which information is sent to a service provider after an explicit AI request.
      </p>
    </main>
  );
}
