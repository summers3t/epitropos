"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import type {
    RoadmapStageStatus,
    RoadmapTaskStatus,
    Unit19RoadmapStage,
    Unit19RoadmapTask,
} from "@/lib/admin/unit19RoadmapData";
import {
    unit19FocusNotes,
    unit19KeyMetrics,
    unit19RoadmapStages,
} from "@/lib/admin/unit19RoadmapData";

type FilterMode = "all" | "current" | "upcoming" | "completed";

const BACKGROUND_IMAGE = "/images/unit19-roadmap-bg.jpg";

function getStageLabel(status: RoadmapStageStatus) {
    const labels: Record<RoadmapStageStatus, string> = {
        completed: "Completed",
        current: "In Progress",
        upcoming: "Upcoming",
        deferred: "Deferred",
    };

    return labels[status];
}

function getTaskLabel(status: RoadmapTaskStatus) {
    const labels: Record<RoadmapTaskStatus, string> = {
        done: "Done",
        pending: "Pending",
        scheduled: "Scheduled",
        open: "Todo",
        deferred: "Deferred",
    };

    return labels[status];
}

function getStageIcon(status: RoadmapStageStatus) {
    if (status === "completed") return "✓";
    if (status === "current") return "●";
    if (status === "deferred") return "!";
    return "○";
}

function getStageCardClasses(status: RoadmapStageStatus, selected: boolean) {
    if (selected || status === "current") {
        return "border-[#2f80ed]/45 bg-white/72 shadow-[0_20px_70px_rgba(47,128,237,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]";
    }

    if (status === "completed") {
        return "border-white/60 bg-white/46 opacity-70 hover:opacity-100";
    }

    if (status === "deferred") {
        return "border-[#d6b3a7]/45 bg-white/34 opacity-62 hover:opacity-95";
    }

    return "border-white/58 bg-white/50 opacity-78 hover:opacity-100";
}

function getStageMarkerClasses(status: RoadmapStageStatus, selected: boolean) {
    if (selected || status === "current") {
        return "border-[#2f80ed] bg-[#2f80ed] text-white shadow-[0_0_0_8px_rgba(47,128,237,0.12),0_12px_30px_rgba(47,128,237,0.25)]";
    }

    if (status === "completed") {
        return "border-[#20a76b] bg-[#20a76b] text-white shadow-[0_0_0_6px_rgba(32,167,107,0.12)]";
    }

    if (status === "deferred") {
        return "border-[#c78973] bg-white/72 text-[#9a5b47]";
    }

    return "border-[#7d8ca5] bg-white/68 text-[#607086]";
}

function getStatusBadgeClasses(status: RoadmapStageStatus) {
    if (status === "completed") {
        return "border-[#20a76b]/25 bg-[#20a76b]/10 text-[#0f7448]";
    }

    if (status === "current") {
        return "border-[#2f80ed]/30 bg-[#2f80ed]/10 text-[#165bbb]";
    }

    if (status === "deferred") {
        return "border-[#c78973]/30 bg-[#c78973]/10 text-[#8c5947]";
    }

    return "border-[#7d8ca5]/28 bg-[#7d8ca5]/10 text-[#526176]";
}

function getTaskBadgeClasses(status: RoadmapTaskStatus) {
    if (status === "done") {
        return "border-[#20a76b]/25 bg-[#20a76b]/10 text-[#0f7448]";
    }

    if (status === "pending") {
        return "border-[#2f80ed]/28 bg-[#2f80ed]/10 text-[#165bbb]";
    }

    if (status === "scheduled") {
        return "border-[#8a65cc]/28 bg-[#8a65cc]/10 text-[#6240a0]";
    }

    if (status === "deferred") {
        return "border-[#c78973]/30 bg-[#c78973]/10 text-[#8c5947]";
    }

    return "border-[#7d8ca5]/28 bg-[#7d8ca5]/10 text-[#526176]";
}

function createEmptyTask(stageId: string): Unit19RoadmapTask {
    return {
        id: `${stageId}-${Date.now()}`,
        title: "Нова задача",
        note: "Добави кратка бележка.",
        status: "open",
    };
}

function isInteractiveField(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
        target.closest(
            "input, textarea, select, button, a, [contenteditable='true']",
        ),
    );
}

type Unit19RoadmapWorkspaceProps = {
    userName?: string | null;
    userAvatarUrl?: string | null;
};

export default function Unit19RoadmapWorkspace({
    userName,
    userAvatarUrl,
}: Unit19RoadmapWorkspaceProps) {
    const [stages, setStages] =
        useState<Unit19RoadmapStage[]>(unit19RoadmapStages);

    const [selectedStageId, setSelectedStageId] = useState(
        unit19RoadmapStages.find((stage) => stage.status === "current")?.id ??
        unit19RoadmapStages[0]?.id,
    );

    const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(
        () =>
            new Set(
                unit19RoadmapStages
                    .filter((stage) => stage.status === "current")
                    .map((stage) => stage.id),
            ),
    );

    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    const visibleStages = useMemo(() => {
        if (filterMode === "all") return stages;

        if (filterMode === "current") {
            return stages.filter((stage) => stage.status === "current");
        }

        if (filterMode === "upcoming") {
            return stages.filter(
                (stage) => stage.status === "upcoming" || stage.status === "deferred",
            );
        }

        return stages.filter((stage) => stage.status === "completed");
    }, [filterMode, stages]);

    const taskTotals = useMemo(() => {
        const allTasks = stages.flatMap((stage) => stage.tasks);

        return {
            done: allTasks.filter((task) => task.status === "done").length,
            active: allTasks.filter((task) =>
                ["pending", "scheduled", "open"].includes(task.status),
            ).length,
            total: allTasks.length,
        };
    }, [stages]);

    const progressPercent = Math.round(
        (taskTotals.done / Math.max(taskTotals.total, 1)) * 100,
    );

    function toggleExpanded(stageId: string) {
        setExpandedStageIds((current) => {
            const next = new Set(current);

            if (next.has(stageId)) {
                next.delete(stageId);
            } else {
                next.add(stageId);
            }

            return next;
        });
    }

    function selectStage(stageId: string) {
        setSelectedStageId(stageId);

        setExpandedStageIds((current) => {
            const next = new Set(current);
            next.add(stageId);
            return next;
        });
    }

    function addTask(stageId: string) {
        const nextTask = createEmptyTask(stageId);

        setStages((current) =>
            current.map((stage) =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: [...stage.tasks, nextTask],
                    }
                    : stage,
            ),
        );

        setEditingTaskId(nextTask.id);

        setExpandedStageIds((current) => {
            const next = new Set(current);
            next.add(stageId);
            return next;
        });
    }

    function removeTask(stageId: string, taskId: string) {
        setStages((current) =>
            current.map((stage) =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: stage.tasks.filter((task) => task.id !== taskId),
                    }
                    : stage,
            ),
        );

        if (editingTaskId === taskId) {
            setEditingTaskId(null);
        }
    }

    function updateTask(
        stageId: string,
        taskId: string,
        patch: Partial<Unit19RoadmapTask>,
    ) {
        setStages((current) =>
            current.map((stage) =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: stage.tasks.map((task) =>
                            task.id === taskId ? { ...task, ...patch } : task,
                        ),
                    }
                    : stage,
            ),
        );
    }

    return (
        <section className="relative -mx-6 -mb-12 -mt-36 min-h-screen overflow-hidden bg-[#eef4fb] px-5 pb-10 pt-36 text-[#0f1c2e]">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 bg-[length:100%_auto] bg-top bg-no-repeat opacity-70"
                    style={{
                        backgroundImage: `url('${BACKGROUND_IMAGE}')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#f8fbff]/92 via-[#f4f8fd]/72 to-[#f8fbff]/18" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/36 via-white/18 to-[#e8f1fa]/78" />
                <div className="absolute left-1/4 top-20 h-[420px] w-[420px] rounded-full bg-[#2f80ed]/8 blur-[120px]" />
            </div>

            <div className="relative mx-auto grid max-w-[1480px] gap-7 lg:grid-cols-[118px_minmax(0,1fr)]">
                <aside className="hidden lg:block">
                    <div className="sticky top-32 flex max-h-[calc(100vh-150px)] min-h-[680px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/80 bg-white/36 p-3 shadow-[0_24px_70px_rgba(41,73,112,0.10),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl">
                        <div>
                            <Link href="/" className="mb-6 flex justify-center">
                                <Image
                                    src="/logo_no_backgr.png"
                                    alt="Epitropos"
                                    width={92}
                                    height={64}
                                    priority
                                    className="h-auto w-[78px] object-contain"
                                />
                            </Link>

                            <nav className="space-y-1.5">
                                {[
                                    ["Roadmap", "/admin/unit-19-roadmap", "▱"],
                                    ["Dashboard", "/admin", "□"],
                                    ["Screenings", "/admin/screening", "♙"],
                                    ["Cases", "/admin/cases", "▰"],
                                    ["Reports", "/dashboard/reports", "▤"],
                                    ["Offers", "/admin/orders", "◇"],
                                    ["Settings", "/dashboard", "⚙"],
                                ].map(([label, href, icon]) => {
                                    const active = label === "Roadmap";

                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            className={[
                                                "group flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-[10px] font-medium transition duration-300 active:scale-[0.96]",
                                                active
                                                    ? "border-white/85 bg-white/72 text-[#2f80ed] shadow-[0_16px_44px_rgba(47,128,237,0.14)]"
                                                    : "border-transparent text-[#53657d] hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/58 hover:text-[#0f1c2e]",
                                            ].join(" ")}
                                        >
                                            <span className="text-[22px] leading-none">{icon}</span>
                                            <span>{label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-white/72 bg-white/58 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                {userAvatarUrl ? (
                                    // Google profile images are remote URLs. Use a plain img here to avoid
                                    // requiring lh3.googleusercontent.com in next.config.js image domains.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={userAvatarUrl}
                                        alt={userName || "Admin"}
                                        className="mx-auto h-11 w-11 rounded-full object-cover shadow-[0_8px_22px_rgba(41,73,112,0.18)]"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="mx-auto h-11 w-11 rounded-full bg-[#0f1c2e]/90" />
                                )}

                                <div className="mt-2 truncate text-xs font-semibold">
                                    {userName || "summers3t"}
                                </div>
                                <div className="text-[11px] text-[#53657d]">Admin</div>
                            </div>

                            <Link
                                href="/auth/logout"
                                className="flex items-center justify-center rounded-2xl border border-white/70 bg-white/48 px-3 py-3 text-xs text-[#53657d] transition hover:-translate-y-0.5 hover:bg-white/72 hover:text-[#0f1c2e] active:scale-[0.98]"
                            >
                                Log out
                            </Link>
                        </div>
                    </div>
                </aside>

                <main className="space-y-7">
                    <header className="relative overflow-hidden rounded-[34px] border border-white/72 bg-white/48 p-6 shadow-[0_24px_90px_rgba(41,73,112,0.13),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl md:p-8">
                        <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-gradient-to-l from-white/10 to-transparent md:block" />

                        <div className="relative space-y-7">
                            <div className="max-w-2xl">
                                <div className="mb-5 flex flex-wrap items-center gap-3">
                                    <span className="rounded-full border border-[#2f80ed]/20 bg-[#2f80ed]/9 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
                                        Admin Roadmap
                                    </span>
                                    <span className="rounded-full border border-[#0f1c2e]/10 bg-white/42 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#53657d]">
                                        Private Workspace
                                    </span>
                                </div>

                                <h1 className="font-display text-[42px] leading-[0.98] tracking-tight text-[#0f1c2e] md:text-[62px]">
                                    Unit 19 Project Roadmap
                                </h1>

                                <p className="mt-3 text-lg text-[#263957]">
                                    Thessaloniki · Analipsi
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {unit19KeyMetrics.map((metric, index) => {
                                    const value =
                                        metric.label === "Progress"
                                            ? `${progressPercent}%`
                                            : metric.label === "Current focus"
                                                ? "Post-acq."
                                                : metric.label === "Active blockers"
                                                    ? `${taskTotals.active}`
                                                    : metric.value;

                                    return (
                                        <div
                                            key={metric.label}
                                            className="group min-h-[118px] overflow-hidden rounded-[22px] border border-white/80 bg-white/62 p-5 text-left shadow-[0_18px_54px_rgba(41,73,112,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#2f80ed]/30 hover:bg-white/84 hover:shadow-[0_28px_80px_rgba(47,128,237,0.12)]"
                                        >
                                            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[#2f80ed]/15 bg-[#2f80ed]/8 text-[#2f80ed]">
                                                {["◎", "□", "▱", "▣"][index] ?? "○"}
                                            </div>
                                            <div className="text-[11px] uppercase tracking-[0.15em] text-[#687891]">
                                                {metric.label}
                                            </div>
                                            <div className="mt-2 break-words text-[24px] font-semibold leading-tight text-[#0f1c2e]">
                                                {value}
                                            </div>
                                            <div className="mt-3 max-h-10 overflow-hidden text-[11px] leading-5 text-[#53657d]">
                                                {metric.detail}
                                            </div>

                                            {metric.label === "Progress" ? (
                                                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#d7e3f2]">
                                                    <div
                                                        className="h-full rounded-full bg-[#2f80ed] transition-all duration-700"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </header>

                    <section className="rounded-[30px] border border-white/76 bg-white/58 p-5 shadow-[0_22px_80px_rgba(41,73,112,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="font-display text-2xl text-[#0f1c2e]">
                                    Project Stages
                                </h2>
                                <p className="mt-1 text-sm text-[#53657d]">
                                    Complete journey from motivation to stable ownership.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {[
                                    ["all", "Full Journey"],
                                    ["current", "Current Focus"],
                                    ["upcoming", "Upcoming"],
                                    ["completed", "Completed"],
                                ].map(([mode, label]) => {
                                    const active = filterMode === mode;

                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setFilterMode(mode as FilterMode)}
                                            className={[
                                                "rounded-xl border px-5 py-3 text-xs font-semibold transition duration-300 active:scale-[0.98]",
                                                active
                                                    ? "border-[#2f80ed] bg-[#2f80ed] text-white shadow-[0_14px_34px_rgba(47,128,237,0.22)]"
                                                    : "border-white/70 bg-white/54 text-[#263957] hover:-translate-y-0.5 hover:border-[#2f80ed]/35 hover:bg-white/82",
                                            ].join(" ")}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative space-y-3.5 pl-0 md:pl-[64px]">
                            <div className="absolute bottom-10 left-[28px] top-7 hidden w-px bg-gradient-to-b from-[#20a76b]/55 via-[#2f80ed]/65 to-[#b8c7d9]/70 md:block" />

                            {visibleStages.map((stage) => {
                                const selected = stage.id === selectedStageId;
                                const expanded = expandedStageIds.has(stage.id);

                                return (
                                    <article
                                        key={stage.id}
                                        className={[
                                            "relative rounded-[22px] border p-4 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(41,73,112,0.14)]",
                                            getStageCardClasses(stage.status, selected),
                                        ].join(" ")}
                                    >
                                        <div
                                            className="grid cursor-pointer gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                                            role="button"
                                            tabIndex={0}
                                            onClick={(event) => {
                                                if (isInteractiveField(event.target)) return;

                                                if (expanded && selected) {
                                                    toggleExpanded(stage.id);
                                                    return;
                                                }

                                                selectStage(stage.id);
                                            }}
                                            onKeyDown={(event) => {
                                                if (isInteractiveField(event.target)) return;

                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    selectStage(stage.id);
                                                }

                                                if (event.key === " ") {
                                                    event.preventDefault();

                                                    if (expanded && selected) {
                                                        toggleExpanded(stage.id);
                                                        return;
                                                    }

                                                    selectStage(stage.id);
                                                }
                                            }}
                                        >
                                            <div className="hidden md:block">
                                                <div
                                                    className={[
                                                        "absolute -left-[50px] top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition",
                                                        getStageMarkerClasses(stage.status, selected),
                                                    ].join(" ")}
                                                >
                                                    {getStageIcon(stage.status)}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-2xl font-semibold text-[#0f1c2e]">
                                                        {stage.number}
                                                    </span>
                                                    <h3 className="text-lg font-semibold text-[#0f1c2e]">
                                                        {stage.title}
                                                    </h3>
                                                </div>

                                                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#53657d]">
                                                    {stage.summary}
                                                </p>

                                                {expanded ? (
                                                    <div className="mt-5 rounded-[20px] border border-[#cbd7e6]/70 bg-white/50 p-4">
                                                        <div className="mb-4 grid gap-3 md:grid-cols-3">
                                                            <div className="border-r border-[#cbd7e6]/70 pr-3">
                                                                <div className="text-[10px] uppercase tracking-[0.15em] text-[#687891]">
                                                                    Active tasks
                                                                </div>
                                                                <div className="mt-1 text-sm font-semibold text-[#0f1c2e]">
                                                                    {
                                                                        stage.tasks.filter((task) =>
                                                                            ["pending", "scheduled", "open"].includes(
                                                                                task.status,
                                                                            ),
                                                                        ).length
                                                                    }
                                                                </div>
                                                            </div>

                                                            <div className="border-r border-[#cbd7e6]/70 pr-3">
                                                                <div className="text-[10px] uppercase tracking-[0.15em] text-[#687891]">
                                                                    Stage status
                                                                </div>
                                                                <div className="mt-1 text-sm font-semibold text-[#0f1c2e]">
                                                                    {getStageLabel(stage.status)}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="text-[10px] uppercase tracking-[0.15em] text-[#687891]">
                                                                    Lesson
                                                                </div>
                                                                <div className="mt-1 text-sm font-semibold text-[#0f1c2e]">
                                                                    Risk control
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {stage.tasks.map((task) => {
                                                                const editing = editingTaskId === task.id;

                                                                return (
                                                                    <div
                                                                        key={task.id}
                                                                        className="rounded-2xl border border-[#d7e3f2] bg-white/54 p-4"
                                                                    >
                                                                        {editing ? (
                                                                            <div className="space-y-3">
                                                                                <input
                                                                                    value={task.title}
                                                                                    onChange={(event) =>
                                                                                        updateTask(stage.id, task.id, {
                                                                                            title: event.target.value,
                                                                                        })
                                                                                    }
                                                                                    className="w-full rounded-xl border border-[#cbd7e6] bg-white/80 px-3 py-2 text-sm text-[#0f1c2e] outline-none transition focus:border-[#2f80ed]"
                                                                                />

                                                                                <textarea
                                                                                    value={task.note}
                                                                                    onChange={(event) =>
                                                                                        updateTask(stage.id, task.id, {
                                                                                            note: event.target.value,
                                                                                        })
                                                                                    }
                                                                                    rows={3}
                                                                                    className="w-full rounded-xl border border-[#cbd7e6] bg-white/80 px-3 py-2 text-sm text-[#0f1c2e] outline-none transition focus:border-[#2f80ed]"
                                                                                />

                                                                                <select
                                                                                    value={task.status}
                                                                                    onChange={(event) =>
                                                                                        updateTask(stage.id, task.id, {
                                                                                            status: event.target
                                                                                                .value as RoadmapTaskStatus,
                                                                                        })
                                                                                    }
                                                                                    className="rounded-xl border border-[#cbd7e6] bg-white/80 px-3 py-2 text-sm text-[#0f1c2e] outline-none transition focus:border-[#2f80ed]"
                                                                                >
                                                                                    <option value="done">Done</option>
                                                                                    <option value="pending">
                                                                                        Pending
                                                                                    </option>
                                                                                    <option value="scheduled">
                                                                                        Scheduled
                                                                                    </option>
                                                                                    <option value="open">Todo</option>
                                                                                    <option value="deferred">
                                                                                        Deferred
                                                                                    </option>
                                                                                </select>

                                                                                <div className="flex justify-end">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setEditingTaskId(null)
                                                                                        }
                                                                                        className="rounded-xl bg-[#2f80ed] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#236fcc] active:translate-y-0 active:scale-[0.98]"
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                                                <div>
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <span
                                                                                            className={[
                                                                                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                                                                getTaskBadgeClasses(
                                                                                                    task.status,
                                                                                                ),
                                                                                            ].join(" ")}
                                                                                        >
                                                                                            {getTaskLabel(task.status)}
                                                                                        </span>
                                                                                    </div>

                                                                                    <h4 className="mt-2 text-sm font-semibold text-[#0f1c2e]">
                                                                                        {task.title}
                                                                                    </h4>
                                                                                    <p className="mt-1 text-xs leading-5 text-[#53657d]">
                                                                                        {task.note}
                                                                                    </p>
                                                                                </div>

                                                                                <div className="flex shrink-0 gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setEditingTaskId(task.id)
                                                                                        }
                                                                                        className="rounded-xl border border-[#cbd7e6] bg-white/65 px-3 py-2 text-xs text-[#263957] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/40 hover:bg-white active:translate-y-0 active:scale-[0.98]"
                                                                                    >
                                                                                        Edit
                                                                                    </button>

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            removeTask(stage.id, task.id)
                                                                                        }
                                                                                        className="rounded-xl border border-[#e0b4a8] bg-[#c78973]/8 px-3 py-2 text-xs text-[#8c5947] transition hover:-translate-y-0.5 hover:bg-[#c78973]/14 active:translate-y-0 active:scale-[0.98]"
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="mt-4 rounded-2xl border border-[#2f80ed]/20 bg-[#2f80ed]/7 p-4 text-sm leading-6 text-[#263957]">
                                                            <span className="font-semibold text-[#165bbb]">
                                                                Epitropos lesson:
                                                            </span>{" "}
                                                            {stage.lesson}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="flex items-start">
                                                <span
                                                    className={[
                                                        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                        getStatusBadgeClasses(stage.status),
                                                    ].join(" ")}
                                                >
                                                    {getStageLabel(stage.status)}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        addTask(stage.id);
                                                    }}
                                                    className="rounded-xl border border-[#cbd7e6] bg-white/58 px-3 py-2 text-xs text-[#53657d] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/40 hover:bg-white hover:text-[#0f1c2e] active:translate-y-0 active:scale-[0.98]"
                                                >
                                                    + Task
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        toggleExpanded(stage.id);
                                                    }}
                                                    className="rounded-xl border border-[#cbd7e6] bg-white/58 px-3 py-2 text-xs text-[#53657d] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/40 hover:bg-white hover:text-[#0f1c2e] active:translate-y-0 active:scale-[0.98]"
                                                >
                                                    {expanded ? "Close" : "Open"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="grid gap-5 rounded-[30px] border border-white/72 bg-white/58 p-5 shadow-[0_22px_80px_rgba(41,73,112,0.12),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-2xl xl:grid-cols-[1fr_1fr_1fr_320px]">
                        {unit19FocusNotes.map((note, index) => (
                            <div
                                key={note}
                                className="border-[#cbd7e6]/70 text-sm leading-6 text-[#263957] xl:border-r xl:pr-5"
                            >
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#2f80ed]">
                                    {index === 0
                                        ? "Keep documents organized"
                                        : index === 1
                                            ? "Track in real time"
                                            : "Stay ahead of risk"}
                                </div>
                                {note}
                            </div>
                        ))}

                        <div className="rounded-[24px] border border-[#2f80ed]/18 bg-white/68 p-4 shadow-[0_14px_44px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-xl">
                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#2f80ed]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#2f80ed]" />
                                AI Workspace
                            </div>

                            <p className="mt-2 text-sm leading-6 text-[#263957]">
                                Use the project chat as the working layer for decisions, summaries and
                                next-step planning.
                            </p>

                            <div className="mt-4 space-y-2">
                                <a
                                    href="https://chat.openai.com/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between rounded-2xl border border-[#2f80ed]/25 bg-[#2f80ed]/8 px-4 py-3 text-sm font-semibold text-[#165bbb] transition hover:-translate-y-0.5 hover:bg-[#2f80ed]/12 active:translate-y-0 active:scale-[0.98]"
                                >
                                    <span>Open ChatGPT</span>
                                    <span>↗</span>
                                </a>

                                <button
                                    type="button"
                                    disabled
                                    className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-[#cbd7e6] bg-white/48 px-4 py-3 text-left text-sm text-[#687891]"
                                >
                                    <span>Export roadmap context</span>
                                    <span className="rounded-full border border-[#cbd7e6] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#687891]">
                                        Soon
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled
                                    className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-[#cbd7e6] bg-white/48 px-4 py-3 text-left text-sm text-[#687891]"
                                >
                                    <span>Epitropos AI Assistant</span>
                                    <span className="rounded-full border border-[#cbd7e6] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#687891]">
                                        Planned
                                    </span>
                                </button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </section>
    );
}