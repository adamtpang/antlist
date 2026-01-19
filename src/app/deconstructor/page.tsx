"use client";

import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";

// Unified tree structure - everything is a TaskNode
interface TaskNode {
    id: string;
    text: string;
    completed: boolean;
    children: TaskNode[];
    isDeconstructing?: boolean;
}

interface FolderData {
    name: string;
    tier: "A" | "B" | "C" | null;
    tasks: TaskNode[];
    completed: boolean;
    expanded: boolean;
}

interface FlowSession {
    date: string; // YYYY-MM-DD
    duration: number; // seconds
    task: string;
}

type ViewMode = "upload" | "tinder" | "tree";

function generateId(): string {
    return Math.random().toString(36).substring(2, 11);
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Deconstructor() {
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("upload");
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
    const [sortHistory, setSortHistory] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Flow timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [currentIntention, setCurrentIntention] = useState("");
    const [flowSessions, setFlowSessions] = useState<FlowSession[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("deconstructor-tree");
        if (saved) {
            const parsed = JSON.parse(saved);
            setFolders(parsed);
            const unsorted = parsed.filter((f: FolderData) => f.tier === null);
            setViewMode(unsorted.length > 0 ? "tinder" : parsed.length > 0 ? "tree" : "upload");
        }
        // Load flow sessions
        const savedSessions = localStorage.getItem("flow-sessions");
        if (savedSessions) setFlowSessions(JSON.parse(savedSessions));
    }, []);

    // Save folders to localStorage
    useEffect(() => {
        if (folders.length > 0) {
            localStorage.setItem("deconstructor-tree", JSON.stringify(folders));
        }
    }, [folders]);

    // Save sessions to localStorage
    useEffect(() => {
        if (flowSessions.length > 0) {
            localStorage.setItem("flow-sessions", JSON.stringify(flowSessions));
        }
    }, [flowSessions]);

    // Timer tick
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerRunning]);

    const startTimer = () => setIsTimerRunning(true);

    const stopTimer = () => {
        setIsTimerRunning(false);
        if (timerSeconds >= 60) { // Only save sessions >= 1 min
            const today = new Date().toISOString().split("T")[0];
            setFlowSessions(prev => [...prev, {
                date: today,
                duration: timerSeconds,
                task: currentIntention || "Focused work"
            }]);
        }
        setTimerSeconds(0);
        setCurrentIntention("");
    };

    // Get daily totals for heatmap (last 90 days)
    const getDailyTotals = () => {
        const totals: Record<string, number> = {};
        flowSessions.forEach(s => {
            totals[s.date] = (totals[s.date] || 0) + s.duration;
        });
        return totals;
    };

    const parseTier = (name: string): { tier: "A" | "B" | "C" | null; cleanName: string } => {
        const match = name.match(/^\[([ABC])\]\s*/i);
        return match ? { tier: match[1].toUpperCase() as "A" | "B" | "C", cleanName: name.replace(match[0], "") } : { tier: null, cleanName: name };
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith(".zip")) {
            const zip = await JSZip.loadAsync(file);
            const newFolders: FolderData[] = [];

            for (const [path, zipEntry] of Object.entries(zip.files)) {
                if (zipEntry.dir || !path.endsWith(".txt")) continue;
                const content = await zipEntry.async("string");
                const fileName = path.split("/").pop() || path;
                const { tier, cleanName } = parseTier(fileName.replace(".txt", ""));
                const taskLines = content.split("\n").map(l => l.replace(/^-\s*\[.\]\s*|^-\s*|\*\s*/, "").trim()).filter(l => l.length > 0);

                if (taskLines.length > 0) {
                    const tasks: TaskNode[] = taskLines.map(text => ({
                        id: generateId(),
                        text,
                        completed: false,
                        children: []
                    }));
                    newFolders.push({ name: cleanName, tier, tasks, completed: false, expanded: false });
                }
            }

            setFolders(newFolders);
            const unsorted = newFolders.filter(f => f.tier === null);
            setViewMode(unsorted.length > 0 ? "tinder" : "tree");
        }
    };

    const assignTier = (tier: "A" | "B" | "C") => {
        const unsorted = folders.filter(f => f.tier === null);
        if (unsorted.length === 0) { setViewMode("tree"); return; }

        const folderName = unsorted[0].name;
        setSortHistory(prev => [...prev, folderName]);

        setFolders(prev => {
            const updated = prev.map(f => f.name === folderName ? { ...f, tier } : f);
            if (updated.filter(f => f.tier === null).length === 0) {
                setTimeout(() => setViewMode("tree"), 0);
            }
            return updated;
        });
    };

    const undoLastSort = () => {
        if (sortHistory.length === 0) return;
        const lastFolderName = sortHistory[sortHistory.length - 1];
        setSortHistory(prev => prev.slice(0, -1));
        setFolders(prev => prev.map(f =>
            f.name === lastFolderName ? { ...f, tier: null } : f
        ));
    };

    const resetAllRatings = () => {
        setSortHistory([]);
        setFolders(prev => prev.map(f => ({ ...f, tier: null })));
    };

    // Deconstruct a task into ≤3 min baby steps
    const deconstructTask = async (folderId: number, taskId: string) => {
        setLoadingTaskId(taskId);

        // Find the task text
        let taskText = "";
        let folderName = "";
        const folder = folders[folderId];
        folderName = folder.name;

        const findTask = (nodes: TaskNode[]): TaskNode | null => {
            for (const n of nodes) {
                if (n.id === taskId) return n;
                const found = findTask(n.children);
                if (found) return found;
            }
            return null;
        };

        const task = findTask(folder.tasks);
        if (task) taskText = task.text;

        try {
            const response = await fetch("/api/deconstruct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task: taskText, context: folderName }),
            });

            if (!response.ok) throw new Error("Failed");
            const data = await response.json();

            // Convert milestones to children TaskNodes
            const children: TaskNode[] = [];
            if (data.milestones) {
                for (const m of data.milestones) {
                    const milestoneNode: TaskNode = {
                        id: generateId(),
                        text: `🎯 ${m.title}`,
                        completed: false,
                        children: m.steps.slice(0, 3).map((step: string) => ({
                            id: generateId(),
                            text: step,
                            completed: false,
                            children: []
                        }))
                    };
                    children.push(milestoneNode);
                }
            }

            // Update the task with children
            setFolders(prev => prev.map((f, fIdx) => {
                if (fIdx !== folderId) return f;

                const updateChildren = (nodes: TaskNode[]): TaskNode[] => {
                    return nodes.map(n => {
                        if (n.id === taskId) {
                            return { ...n, children: [...n.children, ...children] };
                        }
                        return { ...n, children: updateChildren(n.children) };
                    });
                };

                return { ...f, tasks: updateChildren(f.tasks) };
            }));
        } catch (err) {
            console.error(err);
        }

        setLoadingTaskId(null);
    };

    // Toggle completion - cascades to children
    const toggleTaskComplete = (folderId: number, taskId: string) => {
        setFolders(prev => prev.map((f, fIdx) => {
            if (fIdx !== folderId) return f;

            const toggleNode = (nodes: TaskNode[], newValue?: boolean): TaskNode[] => {
                return nodes.map(n => {
                    if (n.id === taskId) {
                        const completed = newValue ?? !n.completed;
                        // Cascade to all children
                        const cascadeComplete = (children: TaskNode[]): TaskNode[] =>
                            children.map(c => ({ ...c, completed, children: cascadeComplete(c.children) }));
                        return { ...n, completed, children: cascadeComplete(n.children) };
                    }
                    return { ...n, children: toggleNode(n.children, newValue) };
                });
            };

            const updatedTasks = toggleNode(f.tasks);
            const allComplete = updatedTasks.every(t => t.completed);
            return { ...f, tasks: updatedTasks, completed: allComplete };
        }));
    };

    const toggleFolderComplete = (folderId: number) => {
        setFolders(prev => prev.map((f, fIdx) => {
            if (fIdx !== folderId) return f;
            const newCompleted = !f.completed;

            const setAllComplete = (nodes: TaskNode[]): TaskNode[] =>
                nodes.map(n => ({ ...n, completed: newCompleted, children: setAllComplete(n.children) }));

            return { ...f, completed: newCompleted, tasks: setAllComplete(f.tasks) };
        }));
    };

    const toggleFolderExpand = (folderId: number) => {
        setFolders(prev => prev.map((f, fIdx) =>
            fIdx === folderId ? { ...f, expanded: !f.expanded } : f
        ));
    };

    const changeFolderTier = (folderId: number, newTier: "A" | "B" | "C") => {
        setFolders(prev => prev.map((f, fIdx) =>
            fIdx === folderId ? { ...f, tier: newTier } : f
        ));
    };

    const reset = () => {
        setFolders([]);
        localStorage.removeItem("deconstructor-tree");
        setViewMode("upload");
    };

    // Download sorted ZIP with tier prefixes
    const downloadSortedZip = async () => {
        const zip = new JSZip();

        for (const folder of folders) {
            if (!folder.tier) continue;

            // Create filename with tier prefix
            const fileName = `[${folder.tier}] ${folder.name}.txt`;

            // Collect all tasks (flattening the tree for export)
            const collectTasks = (nodes: TaskNode[], prefix: string = ""): string[] => {
                const lines: string[] = [];
                for (const node of nodes) {
                    const status = node.completed ? "[x]" : "[ ]";
                    lines.push(`${prefix}- ${status} ${node.text}`);
                    if (node.children.length > 0) {
                        lines.push(...collectTasks(node.children, prefix + "  "));
                    }
                }
                return lines;
            };

            const content = collectTasks(folder.tasks).join("\n");
            zip.file(fileName, content);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `sorted-folders-${new Date().toISOString().split("T")[0]}.zip`;
        a.click();
    };

    // Recursive task node renderer
    const renderTaskNode = (node: TaskNode, folderId: number, depth: number = 0) => {
        const isLoading = loadingTaskId === node.id;
        const hasChildren = node.children.length > 0;
        const isMilestone = node.text.startsWith("🎯");
        const isLeaf = !hasChildren && !isMilestone;

        return (
            <div key={node.id} className={`${depth > 0 ? "ml-4 border-l-2 border-[var(--border)]/30 pl-2" : ""}`}>
                <div className={`flex items-start gap-2 py-1.5 group ${node.completed ? "opacity-50" : ""}`}>
                    <input
                        type="checkbox"
                        checked={node.completed}
                        onChange={() => toggleTaskComplete(folderId, node.id)}
                        className={`mt-0.5 ${isMilestone ? "accent-blue-500" : "accent-green-500"} ${depth === 0 ? "w-4 h-4" : "w-3 h-3"}`}
                    />
                    <span className={`flex-1 ${depth === 0 ? "text-sm font-medium" : "text-xs"} ${node.completed ? "line-through" : ""} ${isMilestone ? "text-blue-300" : ""}`}>
                        {node.text}
                    </span>

                    {/* Show deconstruct button for items without children (leaves) */}
                    {isLeaf && !node.completed && (
                        <button
                            onClick={() => deconstructTask(folderId, node.id)}
                            disabled={isLoading}
                            className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 bg-[var(--primary)] text-black rounded hover:opacity-80 disabled:opacity-50 transition-opacity"
                        >
                            {isLoading ? "..." : "⚛️ Break down"}
                        </button>
                    )}

                    {isLeaf && !node.completed && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">≤3m</span>
                    )}
                </div>

                {/* Render children */}
                {hasChildren && (
                    <div className="mt-1">
                        {node.children.map(child => renderTaskNode(child, folderId, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Sort folders: A first, then by task count (fewest first)
    const sortedFolders = [...folders].sort((a, b) => {
        const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
        const diff = (a.tier ? tierOrder[a.tier] : 3) - (b.tier ? tierOrder[b.tier] : 3);
        return diff !== 0 ? diff : a.tasks.length - b.tasks.length;
    });

    const unsortedFolders = folders.filter(f => f.tier === null);
    const currentTinderFolder = unsortedFolders[0];

    const tierColors = {
        A: { bg: "border-green-500/50", label: "bg-green-500 text-black", text: "text-green-400" },
        B: { bg: "border-yellow-500/50", label: "bg-yellow-500 text-black", text: "text-yellow-400" },
        C: { bg: "border-red-500/50", label: "bg-red-500 text-white", text: "text-red-400" }
    };

    // Generate heatmap days (last 90 days)
    const generateHeatmapDays = () => {
        const days = [];
        const dailyTotals = getDailyTotals();
        for (let i = 89; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            const totalSeconds = dailyTotals[dateStr] || 0;
            const minutes = Math.floor(totalSeconds / 60);
            // Intensity: 0 = none, 1 = light, 2 = medium, 3 = dark, 4 = darkest
            const intensity = minutes === 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 60 ? 3 : 4;
            days.push({ date: dateStr, minutes, intensity });
        }
        return days;
    };

    return (
        <div className="min-h-screen flex">
            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold">⚛️ Atomic Deconstructor</h1>
                    <p className="text-[var(--muted-foreground)] text-sm mt-1">Break everything into ≤3 min baby steps</p>
                    <a href="/" className="text-xs text-[var(--primary)] hover:underline">← Coalescer</a>

                    <div className="mt-4 aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden">
                        <iframe className="w-full h-full" src="https://www.youtube.com/embed/TQMbvJNRpLE" title="Video" allowFullScreen />
                    </div>
                </div>

                {/* UPLOAD */}
                {viewMode === "upload" && (
                    <div>
                        <div className="drop-zone rounded-xl p-8 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input ref={fileInputRef} type="file" accept=".zip,.txt" className="hidden" onChange={handleUpload} />
                            <div className="text-4xl mb-2">📦</div>
                            <p className="text-sm">Upload ZIP of folders</p>
                        </div>
                        {folders.length > 0 && (
                            <button onClick={() => setViewMode("tree")} className="mt-4 text-sm text-[var(--primary)] hover:underline">
                                View tree ({folders.length} folders)
                            </button>
                        )}
                    </div>
                )}

                {/* TINDER */}
                {viewMode === "tinder" && currentTinderFolder && (
                    <div className="text-center">
                        <p className="text-sm text-[var(--muted-foreground)] mb-4">
                            {folders.length - unsortedFolders.length + 1}/{folders.length}
                        </p>
                        <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-6 mb-6 max-w-sm mx-auto">
                            <div className="text-4xl mb-3">📂</div>
                            <h2 className="text-xl font-bold">{currentTinderFolder.name}</h2>
                            <p className="text-[var(--muted-foreground)] text-sm">{currentTinderFolder.tasks.length} tasks</p>
                            <div className="mt-3 text-left max-h-32 overflow-y-auto text-xs text-[var(--muted-foreground)]">
                                {currentTinderFolder.tasks.slice(0, 5).map(t => (
                                    <div key={t.id} className="truncate">• {t.text}</div>
                                ))}
                                {currentTinderFolder.tasks.length > 5 && <div>...and {currentTinderFolder.tasks.length - 5} more</div>}
                            </div>
                        </div>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => assignTier("C")} className="w-16 h-16 rounded-full bg-red-500 text-white text-2xl font-bold hover:scale-110 transition-transform">C</button>
                            <button onClick={() => assignTier("B")} className="w-16 h-16 rounded-full bg-yellow-500 text-black text-2xl font-bold hover:scale-110 transition-transform">B</button>
                            <button onClick={() => assignTier("A")} className="w-16 h-16 rounded-full bg-green-500 text-black text-2xl font-bold hover:scale-110 transition-transform">A</button>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-4">C = Later • B = Medium • A = Priority</p>

                        {/* Undo button */}
                        {sortHistory.length > 0 && (
                            <div className="flex flex-col items-center gap-2 mt-4">
                                <button
                                    onClick={undoLastSort}
                                    className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                                >
                                    ↩️ Undo last ({sortHistory[sortHistory.length - 1]})
                                </button>
                                <button
                                    onClick={resetAllRatings}
                                    className="text-xs text-red-400 hover:underline"
                                >
                                    🔄 Reset all ratings (back to 1/{folders.length})
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* UNIFIED TREE VIEW */}
                {viewMode === "tree" && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold">📋 Task Tree</h2>
                            <div className="flex gap-2">
                                <button onClick={downloadSortedZip} className="text-xs px-2 py-1 bg-[var(--primary)] text-black rounded">📥 ZIP</button>
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-[var(--primary)]">+Upload</button>
                                <button onClick={reset} className="text-xs text-red-400">Reset</button>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".zip,.txt" className="hidden" onChange={handleUpload} />
                        </div>

                        {/* Group by tier */}
                        {(["A", "B", "C"] as const).map(tier => {
                            const tierFolders = sortedFolders.filter(f => f.tier === tier);
                            if (tierFolders.length === 0) return null;

                            return (
                                <div key={tier} className="mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${tierColors[tier].label}`}>{tier}</span>
                                        <span className={`text-sm font-semibold ${tierColors[tier].text}`}>
                                            {tier === "A" ? "Priority" : tier === "B" ? "Medium" : "Later"}
                                        </span>
                                        <span className="text-xs text-[var(--muted-foreground)]">({tierFolders.length} folders)</span>
                                    </div>

                                    <div className={`space-y-2 border-l-2 ${tierColors[tier].bg} pl-3`}>
                                        {tierFolders.map((folder, folderIdx) => {
                                            const globalIdx = folders.findIndex(f => f.name === folder.name);
                                            const completedTasks = folder.tasks.filter(t => t.completed).length;

                                            return (
                                                <div key={folder.name} className={`bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden ${folder.completed ? "opacity-50" : ""}`}>
                                                    {/* Folder header */}
                                                    <div
                                                        className="p-3 flex items-center gap-2 cursor-pointer hover:bg-[var(--border)]/20"
                                                        onClick={() => toggleFolderExpand(globalIdx)}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={folder.completed}
                                                            onChange={(e) => { e.stopPropagation(); toggleFolderComplete(globalIdx); }}
                                                            className="w-5 h-5 accent-green-500"
                                                        />
                                                        <span className="text-lg">{folder.expanded ? "📂" : "📁"}</span>
                                                        <span className={`flex-1 font-medium ${folder.completed ? "line-through" : ""}`}>
                                                            {folder.name}
                                                        </span>
                                                        <span className="text-xs text-[var(--muted-foreground)]">
                                                            {completedTasks}/{folder.tasks.length}
                                                        </span>
                                                        {/* Tier change buttons */}
                                                        <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                                            {(["A", "B", "C"] as const).map(t => (
                                                                <button
                                                                    key={t}
                                                                    onClick={() => changeFolderTier(globalIdx, t)}
                                                                    className={`w-5 h-5 text-[10px] font-bold rounded ${folder.tier === t
                                                                        ? t === "A" ? "bg-green-500 text-black" : t === "B" ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                                                                        : "bg-[var(--border)] text-[var(--muted-foreground)] hover:opacity-80"
                                                                        }`}
                                                                >
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Progress bar - Flow state feedback */}
                                                    <div className="px-3 pb-2">
                                                        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-300 ${completedTasks === folder.tasks.length
                                                                    ? "bg-green-500"
                                                                    : tier === "A" ? "bg-green-400" : tier === "B" ? "bg-yellow-400" : "bg-red-400"
                                                                    }`}
                                                                style={{ width: `${folder.tasks.length > 0 ? (completedTasks / folder.tasks.length) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Tasks tree */}
                                                    {folder.expanded && (
                                                        <div className="border-t border-[var(--border)] p-3 bg-[var(--border)]/5">
                                                            {folder.tasks.map(task => renderTaskNode(task, globalIdx))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        <p className="text-xs text-[var(--muted-foreground)] text-center mt-6">
                            💡 Hover over any task and click "⚛️ Break down" to split into ≤3 min steps
                        </p>
                    </div>
                )}
            </main>

            {/* Flow Timer Panel - Right Side */}
            <aside className="w-64 border-l border-[var(--border)] p-4 bg-[var(--card)] hidden md:block sticky top-0 h-screen overflow-y-auto">
                <h2 className="font-bold text-lg mb-4">⏱️ Flow Timer</h2>

                {/* Timer Display */}
                <div className="text-center mb-4">
                    <div className={`text-4xl font-mono font-bold ${isTimerRunning ? "text-green-400" : ""}`}>
                        {formatTime(timerSeconds)}
                    </div>
                    {isTimerRunning && (
                        <input
                            type="text"
                            value={currentIntention}
                            onChange={(e) => setCurrentIntention(e.target.value)}
                            placeholder="What are you working on?"
                            className="w-full mt-2 p-2 text-xs bg-[var(--border)]/30 border border-[var(--border)] rounded text-center"
                        />
                    )}
                </div>

                {/* Start/Stop Button */}
                <button
                    onClick={isTimerRunning ? stopTimer : startTimer}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${isTimerRunning
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-black"
                        }`}
                >
                    {isTimerRunning ? "⏹ Stop" : "▶ Start"}
                </button>

                <p className="text-xs text-[var(--muted-foreground)] text-center mt-2">
                    Sessions ≥1 min are saved
                </p>

                {/* GitHub-style Contribution Heatmap */}
                <div className="mt-6">
                    <h3 className="font-semibold text-sm mb-2">📊 Last 90 Days</h3>
                    <div className="grid grid-cols-10 gap-1">
                        {generateHeatmapDays().map((day, i) => (
                            <div
                                key={i}
                                title={`${day.date}: ${day.minutes} min`}
                                className={`w-4 h-4 rounded-sm cursor-pointer transition-colors ${day.intensity === 0 ? "bg-[var(--border)]" :
                                        day.intensity === 1 ? "bg-green-900" :
                                            day.intensity === 2 ? "bg-green-700" :
                                                day.intensity === 3 ? "bg-green-500" :
                                                    "bg-green-400"
                                    }`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 bg-[var(--border)] rounded-sm" />
                            <div className="w-3 h-3 bg-green-900 rounded-sm" />
                            <div className="w-3 h-3 bg-green-700 rounded-sm" />
                            <div className="w-3 h-3 bg-green-500 rounded-sm" />
                            <div className="w-3 h-3 bg-green-400 rounded-sm" />
                        </div>
                        <span>More</span>
                    </div>
                </div>

                {/* Today's Stats */}
                <div className="mt-6 p-3 bg-[var(--border)]/20 rounded-lg">
                    <div className="text-xs text-[var(--muted-foreground)]">Today</div>
                    <div className="text-xl font-bold text-green-400">
                        {formatTime(getDailyTotals()[new Date().toISOString().split("T")[0]] || 0)}
                    </div>
                </div>

                {/* Total Stats */}
                <div className="mt-3 p-3 bg-[var(--border)]/20 rounded-lg">
                    <div className="text-xs text-[var(--muted-foreground)]">Total Sessions</div>
                    <div className="text-lg font-bold">{flowSessions.length}</div>
                </div>
            </aside>
        </div>
    );
}
