import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://8020.best"),
  applicationName: "8020.best",
  title: "8020.best · Do the vital 20% first",
  description:
    "Dump your tasks, let AI sort them into priority tiers, and focus on the vital 20% that drives 80% of the results.",
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "Adam Pangelinan", url: "https://adampang.com" }],
  creator: "Adam Pangelinan",
  publisher: "Anchor Marianas LLC",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "8020.best · Do the vital 20% first",
    description: "Dump your tasks, sort them by priority, and do the vital few first.",
    url: "https://8020.best",
    siteName: "8020.best",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "8020.best · Do the vital 20% first",
    description: "Turn a task dump into six clear priority tiers and start with the vital few.",
  },
  other: {
    "ai-summary":
      "8020.best is a free, local-first task prioritizer that sorts a pasted or uploaded task list into six priority tiers.",
    "ai-facts":
      "Price: $0; no account required; task library stored in browser IndexedDB; AI sorting uses Anthropic only when requested.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://8020.best/#organization",
      name: "Anchor Marianas LLC",
      url: "https://anchormarianas.com/",
    },
    {
      "@type": "Person",
      "@id": "https://8020.best/#creator",
      name: "Adam Pangelinan",
      url: "https://adampang.com/",
    },
    {
      "@type": "WebApplication",
      "@id": "https://8020.best/#application",
      name: "8020.best",
      url: "https://8020.best/",
      description:
        "A local-first task prioritizer that sorts pasted or uploaded tasks into six priority tiers.",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Any modern web browser",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      creator: { "@id": "https://8020.best/#creator" },
      publisher: { "@id": "https://8020.best/#organization" },
      featureList: [
        "Task sorting into S, A, B, C, D, and F priority tiers",
        "Local task storage in IndexedDB",
        "Markdown and ZIP import and export",
        "Optional AI task decomposition",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://8020.best/#website",
      name: "8020.best",
      url: "https://8020.best/",
      publisher: { "@id": "https://8020.best/#organization" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <footer className="site-footer">
          <nav aria-label="Trust and support">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/support">Support</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <div>
            Built by <a href="https://adampang.com">Adam Pangelinan</a>
            {" · "}<a href="https://anchormarianas.com">Anchor Marianas LLC</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
