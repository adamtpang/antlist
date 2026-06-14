import type { Metadata } from "next";
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
  title: "8020.best — Do the vital 20% first",
  description:
    "Dump your tasks, let AI sort them into priority tiers, and focus on the vital 20% that drives 80% of the results.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "8020.best — Do the vital 20% first",
    description: "Dump your tasks, sort them by priority, and do the vital few first.",
    url: "https://8020.best",
    siteName: "8020.best",
    type: "website",
  },
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
        {children}
        <footer style={{padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.75rem', opacity: 0.5}}>
          Built by <a href="https://adampang.com" style={{textDecoration: 'underline'}}>Adam Pangelinan</a>
          {' · '}<a href="https://anchormarianas.com" style={{textDecoration: 'underline'}}>Anchor Marianas LLC</a>
          {' · '}<a href="https://sellsniper.com" style={{textDecoration: 'underline'}}>More projects</a>
        </footer>
      </body>
    </html>
  );
}
