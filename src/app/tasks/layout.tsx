import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Prioritizer · 8020.best",
  description:
    "Paste or upload a task list, sort it into S-to-F priority tiers, and keep a portable local task library.",
  alternates: { canonical: "/tasks" },
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
