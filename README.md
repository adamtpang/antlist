# Antlist

AI-powered task organizer that sorts uploaded tasks into priority tiers and deconstructs them into subtask trees.

## Problem
When you have a pile of unstructured tasks (from notes, files, or brain dumps), you need a fast way to triage them by importance and break big ones into actionable subtasks.

## What It Does
- Drag-and-drop file upload to ingest tasks; uses AI (OpenAI + Replicate) to sort them into A/B/C priority tiers.
- "Deconstructor" view that breaks tasks into recursive subtask trees with completion tracking.
- Persists data locally via IndexedDB; supports ZIP export/import.

## Tech Stack
Next.js 15, TypeScript, OpenAI API, Replicate, IndexedDB (idb-keyval), JSZip, Tailwind CSS.
