import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Deconstructor · 8020.best",
  description:
    "Break a large task into a small milestone tree with short, concrete next steps.",
  alternates: { canonical: "/deconstructor" },
};

export default function DeconstructorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
