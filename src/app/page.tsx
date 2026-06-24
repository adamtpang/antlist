"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";
import { get, set } from "idb-keyval";
import { Folder, Task, Tier, SortResponse, TIERS, TIER_COLORS } from "@/lib/types";
import { FolderCard } from "@/components/FolderCard";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Serialize a task tree to an indented markdown checklist (preserves subtasks).
function serializeTasks(tasks: Task[], depth = 0): string {
  return tasks
    .map((t) => {
      const indent = "  ".repeat(depth);
      const line = `${indent}- [${t.completed ? "x" : " "}] ${t.text}`;
      const kids = t.children.length ? "\n" + serializeTasks(t.children, depth + 1) : "";
      return line + kids;
    })
    .join("\n");
}

// Parse an 8020.best markdown export (## tier / ### folder / - [ ] task) back into folders,
// preserving tiers. Returns null if the text isn't in that format, so raw todo lists fall
// through to the AI sorter instead.
function parseAntlistMarkdown(content: string): Folder[] | null {
  const lines = content.split(/\r?\n/);
  const hasTierHeader = lines.some((l) => /^##\s+[SABCDF?](?:\s|$)/.test(l));
  const hasFolderHeader = lines.some((l) => /^###\s+\S/.test(l));
  if (!hasTierHeader || !hasFolderHeader) return null;

  const result: Folder[] = [];
  let currentTier: Tier = null;
  let currentFolder: Folder | null = null;
  let stack: { task: Task; level: number }[] = [];

  for (const raw of lines) {
    const tierMatch = raw.match(/^##\s+([SABCDF?])(?:\s|$)/);
    if (tierMatch) {
      currentTier = tierMatch[1] === "?" ? null : (tierMatch[1] as Tier);
      currentFolder = null;
      stack = [];
      continue;
    }
    const folderMatch = raw.match(/^###\s+(.+)/);
    if (folderMatch) {
      currentFolder = { id: generateId(), name: folderMatch[1].trim(), tier: currentTier, tasks: [], expanded: false };
      result.push(currentFolder);
      stack = [];
      continue;
    }
    const taskMatch = raw.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)/);
    if (taskMatch && currentFolder) {
      const level = Math.floor(taskMatch[1].length / 2);
      const task: Task = { id: generateId(), text: taskMatch[3].trim(), completed: taskMatch[2].toLowerCase() === "x", children: [] };
      if (level === 0) {
        currentFolder.tasks.push(task);
        stack = [{ task, level: 0 }];
      } else {
        while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
        const parent = stack[stack.length - 1];
        if (parent) {
          parent.task.children.push(task);
          stack.push({ task, level });
        } else {
          currentFolder.tasks.push(task);
          stack = [{ task, level: 0 }];
        }
      }
    }
  }

  return result.length ? result : null;
}

// Trigger a browser download for a Blob.
function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read-only rendered task tree for the markdown preview modal.
function renderPreviewTasks(tasks: Task[], depth = 0) {
  return tasks.map((t) => (
    <div key={t.id} style={{ paddingLeft: depth ? 16 : 0 }}>
      <div className="flex items-start gap-2 py-0.5">
        <span
          className={`mt-1 w-3.5 h-3.5 shrink-0 rounded-[3px] border flex items-center justify-center text-[9px] leading-none ${
            t.completed ? "bg-green-500 border-green-500 text-white" : "border-[var(--border)] text-transparent"
          }`}
        >
          ✓
        </span>
        <span className={`text-sm ${t.completed ? "line-through text-[var(--muted-foreground)]" : ""}`}>{t.text}</span>
      </div>
      {t.children.length > 0 && renderPreviewTasks(t.children, depth + 1)}
    </div>
  ));
}

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [rawView, setRawView] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from IndexedDB
  useEffect(() => {
    get("flowlist-folders").then((saved) => {
      if (saved) setFolders(saved);
      setIsLoaded(true);
    });
  }, []);

  // Save to IndexedDB
  useEffect(() => {
    if (isLoaded) {
      set("flowlist-folders", folders);
    }
  }, [folders, isLoaded]);

  // Close the markdown modal on Escape
  useEffect(() => {
    if (!showMarkdown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMarkdown(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMarkdown]);

  // File handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragActive(e.type === "dragenter" || e.type === "dragover");
    }
  }, []);

  const handleFile = async (f: File) => {
    if (f.name.endsWith(".zip")) {
      const zip = new JSZip();
      await zip.loadAsync(f);
      const newFolders: Folder[] = [];

      const processFile = async (relativePath: string, file: JSZip.JSZipObject) => {
        if (file.dir) return; // Skip directories
        if (relativePath.startsWith("__MACOSX/") || relativePath.includes(".DS_Store")) return; // Skip junk

        const text = await file.async("string");
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

        // Parse tiers from path (e.g., "A/Work.txt" or "Work.txt")
        const parts = relativePath.split("/");
        const fileName = parts[parts.length - 1].replace(/\.(txt|md)$/, "");

        // Check for tier in path or filename prefix
        let tier: Tier = null;
        let cleanName = fileName;

        // Check path (e.g. "A/Folder.txt")
        if (parts.length > 1) {
          const parentDir = parts[parts.length - 2];
          if (["S", "A", "B", "C", "D", "F"].includes(parentDir)) {
            tier = parentDir as Tier;
          }
        }

        // Also check filename prefix (e.g. "[A] Folder.txt") for back-compat
        const tierMatch = fileName.match(/^\^([SABCDF])\]\s*(.+)/);
        if (tierMatch) {
          tier = tierMatch[1] as Tier;
          cleanName = tierMatch[2];
        }

        // Parse checksum/count suffix if present (e.g. "Folder (5)")
        cleanName = cleanName.replace(/\s*\(\d+\)$/, "");

        const tasks: Task[] = [];
        const taskStack: { task: Task; level: number }[] = [];

        lines.forEach(line => {
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1].length : 0;
          const level = Math.floor(indent / 2); // Assume 2 spaces per level

          const cleanLine = line.replace(/^\s*-\s*\[([ xX])\]\s*/, "") // Remove "- [ ]"
            .replace(/^\s*-\s*/, ""); // OR remove just "- "
          const completed = line.includes("[x]") || line.includes("[X]");

          const newTask: Task = {
            id: generateId(),
            text: cleanLine,
            completed,
            children: []
          };

          if (level === 0) {
            tasks.push(newTask);
            taskStack.length = 0; // Reset stack
            taskStack.push({ task: newTask, level: 0 });
          } else {
            // Find parent
            while (taskStack.length > 0 && taskStack[taskStack.length - 1].level >= level) {
              taskStack.pop();
            }
            const parent = taskStack[taskStack.length - 1];
            if (parent) {
              parent.task.children.push(newTask);
              taskStack.push({ task: newTask, level });
            } else {
              // Fallback if indentation is weird
              tasks.push(newTask);
              taskStack.push({ task: newTask, level: 0 });
            }
          }
        });

        if (tasks.length > 0) {
          newFolders.push({
            id: generateId(),
            name: cleanName,
            tier,
            tasks,
            expanded: false
          });
        }
      };

      const promises: Promise<void>[] = [];
      zip.forEach((relativePath, file) => {
        promises.push(processFile(relativePath, file));
      });

      await Promise.all(promises);

      // Update state, merging with existing
      setFolders(prev => {
        const existingMap = new Map(prev.map(f => [f.name, f]));
        newFolders.forEach(f => {
          existingMap.set(f.name, f);
        });
        return Array.from(existingMap.values());
      });

      return;
    }

    if (!f.name.endsWith(".txt") && !f.name.endsWith(".md")) return;
    const content = await f.text();

    // If this is an 8020.best markdown export, restore folders + tiers directly (no AI re-sort).
    const restored = parseAntlistMarkdown(content);
    if (restored) {
      setError(null);
      setFolders(prev => {
        const existingMap = new Map(prev.map(f => [f.name, f]));
        restored.forEach(f => existingMap.set(f.name, f));
        return Array.from(existingMap.values());
      });
      return;
    }

    await processContent(content);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processContent = async (content: string) => {
    setError(null);
    const allLines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const newLines = allLines.filter(line => {
      const inExisting = folders.some(f =>
        f.tasks.some(t => t.text.toLowerCase() === line.toLowerCase())
      );
      return !inExisting;
    });

    if (newLines.length === 0) return;

    const BATCH_SIZE = 30;
    const batches: string[][] = [];
    for (let i = 0; i < newLines.length; i += BATCH_SIZE) {
      batches.push(newLines.slice(i, i + BATCH_SIZE));
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: batches.length });

    const newFolders = new Map<string, Task[]>();
    folders.forEach(f => newFolders.set(f.name, [...f.tasks]));

    try {
      for (let i = 0; i < batches.length; i++) {
        const response = await fetch("/api/sort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batch: batches[i],
            existingBuckets: Array.from(newFolders.keys())
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Processing failed: ${response.status}`);
        }
        const data: SortResponse = await response.json();

        for (const item of data.tasks) {
          const task: Task = { id: generateId(), text: item.text, completed: false, children: [] };
          if (!newFolders.has(item.bucket)) {
            newFolders.set(item.bucket, []);
          }
          newFolders.get(item.bucket)!.push(task);
        }

        setProgress({ current: i + 1, total: batches.length });
        if (i < batches.length - 1) await delay(300);
      }

      // Merge with existing folders, new ones get tier: null
      const updatedFolders: Folder[] = [];
      const existingFolderMap = new Map(folders.map(f => [f.name, f]));

      newFolders.forEach((tasks, name) => {
        const existing = existingFolderMap.get(name);
        updatedFolders.push({
          id: existing?.id || generateId(),
          name,
          tier: existing?.tier || null,
          tasks,
          expanded: existing?.expanded || false,
        });
      });

      setFolders(updatedFolders);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Sorting failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Paste raw text directly (no file needed)
  const handlePasteSubmit = async () => {
    if (!pasteText.trim() || isProcessing) return;
    const content = pasteText;
    await processContent(content);
    setPasteText("");
  };

  // Drag-drop for tier sorting
  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    setDraggedFolderId(folderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFolderDragEnd = () => {
    setDraggedFolderId(null);
  };

  const handleTierDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTierDrop = (e: React.DragEvent, tier: Tier) => {
    e.preventDefault();
    if (!draggedFolderId) return;

    setFolders(prev => prev.map(f =>
      f.id === draggedFolderId ? { ...f, tier } : f
    ));
    setDraggedFolderId(null);
  };

  // Toggle folder expansion
  const toggleExpand = (folderId: string) => {
    setFolders(prev => prev.map(f =>
      f.id === folderId ? { ...f, expanded: !f.expanded } : f
    ));
  };

  // Toggle task completion
  const toggleTask = (folderId: string, taskId: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id !== folderId) return f;

      const toggleInTree = (tasks: Task[]): Task[] =>
        tasks.map(t => t.id === taskId
          ? { ...t, completed: !t.completed }
          : { ...t, children: toggleInTree(t.children) }
        );

      return { ...f, tasks: toggleInTree(f.tasks) };
    }));
  };

  // Add subtask
  const addSubtask = (folderId: string, parentTaskId: string, text: string) => {
    if (!text.trim()) return;

    setFolders(prev => prev.map(f => {
      if (f.id !== folderId) return f;

      const addToTree = (tasks: Task[]): Task[] =>
        tasks.map(t => t.id === parentTaskId
          ? { ...t, children: [...t.children, { id: generateId(), text, completed: false, children: [] }] }
          : { ...t, children: addToTree(t.children) }
        );

      return { ...f, tasks: addToTree(f.tasks) };
    }));
  };

  // Clear all
  const clearAll = () => {
    setFolders([]);
    localStorage.removeItem("flowlist-folders");
  };

  // Download ZIP: everything nested under an "8020/" root, tiers as subfolders (re-importable).
  const downloadZip = async () => {
    const zip = new JSZip();
    const date = new Date().toISOString().split("T")[0];
    const root = zip.folder("8020");

    TIERS.forEach(tier => {
      if (!tier) return;
      const tierFolders = folders.filter(f => f.tier === tier);
      if (tierFolders.length === 0) return;
      const tierFolder = root?.folder(tier);
      tierFolders.forEach(folder => {
        tierFolder?.file(`${folder.name}.txt`, serializeTasks(folder.tasks));
      });
    });

    const unsorted = folders.filter(f => f.tier === null);
    if (unsorted.length > 0) {
      const unsortedFolder = root?.folder("_Unsorted");
      unsorted.forEach(folder => {
        unsortedFolder?.file(`${folder.name}.txt`, serializeTasks(folder.tasks));
      });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(`8020-${date}.zip`, new Blob([blob], { type: "application/zip" }));
  };

  // Build the prioritized markdown (S → F, then unsorted). Single source for view / copy / download.
  const buildMarkdown = () => {
    const date = new Date().toISOString().split("T")[0];
    const sections: string[] = [`# 8020.best · ${date}`, "", "_Priority order: top = do these first._", ""];

    TIERS.forEach(tier => {
      if (!tier) return;
      const tierFolders = folders.filter(f => f.tier === tier);
      if (tierFolders.length === 0) return;
      sections.push(`## ${tier}`, "");
      tierFolders.forEach(folder => {
        sections.push(`### ${folder.name}`, serializeTasks(folder.tasks), "");
      });
    });

    const unsorted = folders.filter(f => f.tier === null);
    if (unsorted.length > 0) {
      sections.push(`## ? (Unsorted)`, "");
      unsorted.forEach(folder => {
        sections.push(`### ${folder.name}`, serializeTasks(folder.tasks), "");
      });
    }

    return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  };

  const downloadMarkdown = () => {
    const date = new Date().toISOString().split("T")[0];
    triggerDownload(`8020-${date}.md`, new Blob([buildMarkdown()], { type: "text/markdown;charset=utf-8" }));
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const unsortedFolders = folders.filter(f => f.tier === null);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">8020.best</h1>
        <p className="text-[var(--muted-foreground)] text-sm font-mono">Do the vital 20% first</p>
      </div>

      {/* Paste Box (primary input) */}
      <div className="mb-4">
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handlePasteSubmit();
            }
          }}
          placeholder={"Paste your tasks here, one per line, then Sort…\n\nCall the dentist\nFinish the Q3 report\nBuy groceries"}
          rows={6}
          disabled={isProcessing}
          className="input-field resize-y leading-relaxed disabled:opacity-50"
        />
        <div className="flex items-center justify-between mt-2 gap-3">
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {(() => {
              const n = pasteText.split(/\r?\n/).filter((l) => l.trim()).length;
              return n > 0 ? `${n} line${n === 1 ? "" : "s"} · ⌘/Ctrl+Enter to sort` : "AI sorts them into folders";
            })()}
          </span>
          <button
            onClick={handlePasteSubmit}
            disabled={isProcessing || !pasteText.trim()}
            className="btn-primary text-sm px-4 py-2"
          >
            {isProcessing ? "Sorting…" : "🎯 Sort tasks"}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-[var(--card-border)]" />
        <span className="text-xs text-[var(--muted-foreground)] font-mono">or drop a file</span>
        <div className="h-px flex-1 bg-[var(--card-border)]" />
      </div>

      {/* Drop Zone (secondary) */}
      <div
        className={`drop-zone rounded-xl p-5 text-center cursor-pointer transition-all mb-6 ${isDragActive ? "active glow-primary" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.zip"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="text-2xl mb-2">📄</div>
        <p className="text-sm font-medium">Drop a file</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">.txt, .md, or .zip</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span aria-hidden>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="mb-4">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-center mt-1 text-[var(--muted-foreground)]">
            Processing {progress.current}/{progress.total}
          </p>
        </div>
      )}

      {/* Tier Rows */}
      {folders.length > 0 && (
        <div className="space-y-2">
          {TIERS.map(tier => {
            const tierFolders = folders.filter(f => f.tier === tier);
            return (
              <div
                key={tier}
                className="flex gap-2 items-stretch"
                onDragOver={handleTierDragOver}
                onDrop={(e) => handleTierDrop(e, tier)}
              >
                <div className={`${tier ? TIER_COLORS[tier] : ""} w-12 flex items-center justify-center rounded-lg text-white font-bold text-xl`}>
                  {tier}
                </div>
                <div className="flex-1 min-h-[60px] bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 flex flex-wrap gap-2 items-start">
                  {tierFolders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      isDragged={draggedFolderId === folder.id}
                      onDragStart={handleFolderDragStart}
                      onDragEnd={handleFolderDragEnd}
                      onToggleExpand={toggleExpand}
                      onToggleTask={toggleTask}
                      onAddSubtask={addSubtask}
                    />
                  ))}
                  {tierFolders.length === 0 && (
                    <span className="text-xs text-[var(--muted-foreground)] opacity-50 self-center">
                      Drag folders here
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unsorted */}
          <div
            className="flex gap-2 items-stretch mt-4"
            onDragOver={handleTierDragOver}
            onDrop={(e) => handleTierDrop(e, null)}
          >
            <div className="bg-[var(--muted)] w-12 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] font-bold text-xs">
              ?
            </div>
            <div className="flex-1 min-h-[60px] bg-[var(--card)] border border-dashed border-[var(--border)] rounded-lg p-2 flex flex-wrap gap-2 items-start">
              {unsortedFolders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  isDragged={draggedFolderId === folder.id}
                  onDragStart={handleFolderDragStart}
                  onDragEnd={handleFolderDragEnd}
                  onToggleExpand={toggleExpand}
                  onToggleTask={toggleTask}
                  onAddSubtask={addSubtask}
                />
              ))}
              {unsortedFolders.length === 0 && (
                <span className="text-xs text-[var(--muted-foreground)] opacity-50 self-center">
                  Unsorted folders appear here
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          <button onClick={() => { setRawView(false); setShowMarkdown(true); }} className="btn-primary text-sm px-4 py-2">
            📋 View / copy list
          </button>
          <button onClick={downloadZip} className="btn-secondary text-sm px-4 py-2">
            📦 Export ZIP
          </button>
          <button onClick={clearAll} className="btn-secondary text-sm px-4 py-2 text-red-400">
            🗑️ Clear All
          </button>
        </div>
      )}
      {/* Markdown view / copy modal */}
      {showMarkdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
          onClick={() => setShowMarkdown(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]">
              <h2 className="font-semibold flex-1 flex items-center gap-2">
                <span>📋</span> Prioritized list
              </h2>
              <button onClick={() => setRawView((v) => !v)} className="btn-secondary text-xs px-2.5 py-1">
                {rawView ? "Preview" : "Markdown"}
              </button>
              <button
                onClick={() => setShowMarkdown(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xl leading-none px-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 flex-1">
              {rawView ? (
                <pre className="text-xs font-mono whitespace-pre-wrap bg-[var(--muted)] rounded-lg p-4 leading-relaxed border border-[var(--border)]">
                  {buildMarkdown()}
                </pre>
              ) : (
                <div>
                  {[...TIERS, null].map((tier) => {
                    const tierFolders = folders.filter((f) => f.tier === tier);
                    if (tierFolders.length === 0) return null;
                    return (
                      <div key={tier ?? "unsorted"} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`${tier ? TIER_COLORS[tier] : "bg-[var(--muted)] text-[var(--muted-foreground)]"} w-6 h-6 flex items-center justify-center rounded-md text-white font-bold text-xs shrink-0`}
                          >
                            {tier ?? "?"}
                          </span>
                          <div className="h-px flex-1 bg-[var(--border)]" />
                        </div>
                        <div className="space-y-4 pl-1">
                          {tierFolders.map((folder) => (
                            <div key={folder.id}>
                              <div className="text-sm font-semibold mb-1.5">{folder.name}</div>
                              <div className="pl-0.5">{renderPreviewTasks(folder.tasks)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-[var(--border)]">
              <button onClick={copyMarkdown} className="btn-primary text-sm px-4 py-2 flex-1">
                {copied ? "✓ Copied to clipboard" : "📋 Copy markdown"}
              </button>
              <button onClick={downloadMarkdown} className="btn-secondary text-sm px-4 py-2" title="Download .md file">
                ⬇ .md
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}