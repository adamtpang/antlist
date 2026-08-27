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
  title: "8020 · Your important tabs, first",
  description:
    "Save, search, restore, and prioritize Chrome tabs locally with collections, tasks, a Your 20% focus queue, and optional AI triage.",
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "Adam Pangelinan", url: "https://adampang.com" }],
  creator: "Adam Pangelinan",
  publisher: "Anchor Marianas LLC",
  icons: {
    icon: "/extension-icon.png",
  },
  openGraph: {
    title: "8020 · Your important tabs, first",
    description: "A local-first Chrome tab manager with collections, S-to-F priorities, and a focused Your 20% queue.",
    url: "https://8020.best",
    siteName: "8020.best",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1672,
        height: 941,
        alt: "8020, your important tabs first",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "8020 · Your important tabs, first",
    description: "Save and prioritize Chrome tabs in a private local library that keeps the vital few visible.",
    images: ["/og.png"],
  },
  other: {
    "ai-summary":
      "8020 is a free, local-first Chrome extension for saving, searching, prioritizing, and restoring browser tabs.",
    "ai-facts":
      "Price: $0; no account required; saved-tab library stored in chrome.storage.local; optional AI requires a separately installed local companion and an explicit user action.",
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
      "@type": "SoftwareApplication",
      "@id": "https://8020.best/#application",
      name: "8020 - Priority Tab Manager",
      url: "https://8020.best/",
      description:
        "A local-first Chrome extension for saving, searching, prioritizing, and restoring browser tabs.",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "ChromeOS, macOS, Windows, Linux",
      browserRequirements: "Google Chrome with Manifest V3 support",
      downloadUrl:
        "https://chromewebstore.google.com/detail/hjnoblncmfgibmkbappbndbledimmkme",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      creator: { "@id": "https://8020.best/#creator" },
      publisher: { "@id": "https://8020.best/#organization" },
      featureList: [
        "Save and restore tabs and Chrome tab groups",
        "Searchable local collections and Quick list",
        "S-to-F priority tiers and Your 20% focus queue",
        "Recoverable Trash, Undo, import, and export",
        "Optional AI triage through a separately installed local companion",
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
            <Link href="/tasks">Task prioritizer</Link>
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
