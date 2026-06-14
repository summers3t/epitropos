"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
    unit19FocusNotes,
    unit19KeyMetrics,
    unit19RoadmapStages,
} from "@/lib/admin/unit19RoadmapData";
import {
    createManagedPropertyRoadmapStage,
    createManagedPropertyTask,
    deleteManagedPropertyRoadmapStage,
    deleteManagedPropertyTask,
    getManagedPropertyBySlug,
    getManagedPropertyRoadmap,
    scheduleManagedPropertyTask,
    updateManagedPropertyRoadmapStage,
    updateManagedPropertyTask,
    type ManagedPropertyRoadmapStage,
    type ManagedPropertyRoadmapStageStatus as RoadmapStageStatus,
    type ManagedPropertyRoadmapTask,
    type ManagedPropertyRoadmapTaskStatus as RoadmapTaskStatus,
} from "@/lib/admin/managedPropertiesApi";
import Unit19RealEstateModal from "@/components/admin/Unit19RealEstateModal";
import Unit19ExpensesModal from "@/components/admin/Unit19ExpensesModal";
import Unit19DocumentsModal from "@/components/admin/Unit19DocumentsModal";
import Unit19IncomeModal from "@/components/admin/Unit19IncomeModal";
import Unit19CalendarModal from "@/components/admin/Unit19CalendarModal";
import type { Unit19PanelKey } from "@/components/admin/Unit19ModalSwitcher";

type FilterMode = "all" | "current" | "upcoming" | "completed";
type FocusStatus = Exclude<FilterMode, "all">;

type PendingDeletionRecord = {
    label: string;
    commit: () => Promise<void>;
    undo: () => void;
    timeoutId: number;
};

const BACKGROUND_IMAGE = "/images/unit19-roadmap-bg.jpg";
const FOOTER_IMAGE = "/images/unit19-roadmap-footer.jpg";
const PROPERTY_SLUG = "unit-19";

type Unit19RoadmapTask = ManagedPropertyRoadmapTask;

type Unit19RoadmapStage = {
    id: string;
    dbStageId: string;
    stableKey: string;
    number: string;
    title: string;
    status: RoadmapStageStatus;
    summary: string;
    lesson: string;
    sortOrder: number;
    tasks: Unit19RoadmapTask[];
};

function toIsoDate(value: Date) {
    const copy = new Date(value);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string | null | undefined) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
}

function formatStageNumber(value: number) {
    return String(Math.max(1, value)).padStart(2, "0");
}

function normalizeStageNumber(value: string) {
    const numericValue = Number(value.replace(/\D/g, ""));

    if (!Number.isFinite(numericValue) || numericValue < 1) {
        return null;
    }

    return formatStageNumber(numericValue);
}

function buildStageTitle(number: string, title: string) {
    return `${number} · ${title.trim() || "New stage"}`;
}

function createStageStableKey() {
    return `custom-${Date.now()}`;
}

function parseStageTitle(rawTitle: string) {
    const match = rawTitle.match(/^(\d{2})\s*[·-]\s*(.+)$/);

    if (!match) {
        return { number: "--", title: rawTitle };
    }

    return { number: match[1], title: match[2] };
}

function mapRoadmapFromDb(
    dbStages: ManagedPropertyRoadmapStage[],
    dbTasks: ManagedPropertyRoadmapTask[],
): Unit19RoadmapStage[] {
    return [...dbStages]
        .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
        .map((stage, index) => {
        const localStage = unit19RoadmapStages.find((item) => item.id === stage.stable_key);
        const parsed = parseStageTitle(stage.title);

        return {
            id: stage.id,
            dbStageId: stage.id,
            stableKey: stage.stable_key,
            number: formatStageNumber(index + 1),
            title: parsed.title,
            status: stage.status,
            summary: stage.description ?? localStage?.summary ?? "",
            lesson: localStage?.lesson ?? "Use this stage as the working layer for execution, scheduling and follow-up.",
            sortOrder: stage.sort_order,
            tasks: dbTasks
                .filter((task) => task.stage_id === stage.id)
                .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
        };
    });
}

function getStageLabel(status: RoadmapStageStatus) {
    return { completed: "Completed", current: "In Progress", upcoming: "Upcoming", deferred: "Deferred" }[status];
}

function getTaskLabel(status: RoadmapTaskStatus) {
    return {
        done: "Done",
        pending: "Planned",
        scheduled: "Scheduled",
        open: "Todo",
        deferred: "Deferred",
        in_progress: "In progress",
        watch: "Watch",
        blocked: "Blocked",
        dropped: "Dropped",
    }[status];
}

function isInteractiveField(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
}

const IconCheck = ({ c = "w-3 h-3" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconPlus = ({ c = "w-3 h-3" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const IconChevron = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const IconArrowUp = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
    </svg>
);

const IconCollapse = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v5H3" />
        <path d="M16 3v5h5" />
        <path d="M8 21v-5H3" />
        <path d="M16 21v-5h5" />
        <path d="M3 8l5-5" />
        <path d="M21 8l-5-5" />
        <path d="M3 16l5 5" />
        <path d="M21 16l-5 5" />
    </svg>
);

const IconExternal = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const IconBulb = ({ c = "w-4 h-4" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 5.9L15 17H9l-.7-2.1A7 7 0 0 1 5 9a7 7 0 0 1 7-7z" />
    </svg>
);

const IconClock = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
    </svg>
);

const IconCalendar = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconTrend = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
    </svg>
);

const IconCheckSquare = ({ c = "w-3.5 h-3.5" }: { c?: string }) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
);

function stageCard(status: RoadmapStageStatus, selected: boolean) {
    if (selected && status === "current") {
        return "border-[#2f80ed]/[0.38] bg-white/[0.92] shadow-[0_0_0_1.5px_rgba(47,128,237,0.22),0_20px_64px_rgba(47,128,237,0.14),inset_0_1px_0_rgba(255,255,255,1)]";
    }

    if (selected) {
        return "border-[#2f80ed]/[0.28] bg-white/[0.88] shadow-[0_0_0_1.5px_rgba(47,128,237,0.16),0_16px_48px_rgba(47,128,237,0.10),inset_0_1px_0_rgba(255,255,255,1)]";
    }

    if (status === "completed") {
        return "border-white/[0.62] bg-white/[0.52] opacity-[0.78] hover:bg-white/[0.68] hover:opacity-100 hover:shadow-[0_12px_36px_rgba(41,73,112,0.08)]";
    }

    if (status === "deferred") {
        return "border-[#e4ccc4]/[0.52] bg-white/[0.38] opacity-[0.68] hover:opacity-95";
    }

    return "border-white/[0.62] bg-white/[0.54] opacity-[0.82] hover:bg-white/[0.70] hover:opacity-100 hover:shadow-[0_12px_36px_rgba(41,73,112,0.08)]";
}

function stageMarker(status: RoadmapStageStatus, selected: boolean) {
    if (selected || status === "current") {
        return "border-2 border-[#2f80ed] bg-[#2f80ed] text-white shadow-[0_0_0_5px_rgba(47,128,237,0.15),0_8px_22px_rgba(47,128,237,0.32)]";
    }

    if (status === "completed") {
        return "border-2 border-[#20a76b] bg-[#20a76b] text-white shadow-[0_0_0_4px_rgba(32,167,107,0.13)]";
    }

    if (status === "deferred") {
        return "border-2 border-[#cfa090] bg-white/[0.85] text-[#a06050]";
    }

    return "border-2 border-[#c8d5e2] bg-white/[0.82] text-[#8fa3b8]";
}

function stageConnector(status: RoadmapStageStatus) {
    if (status === "completed") {
        return "bg-[#20a76b] shadow-[0_0_0_1px_rgba(32,167,107,0.10),0_0_16px_rgba(32,167,107,0.22)]";
    }

    if (status === "current") {
        return "bg-[#2f80ed] shadow-[0_0_0_1px_rgba(47,128,237,0.10),0_0_16px_rgba(47,128,237,0.26)]";
    }

    if (status === "deferred") {
        return "bg-[#cfa090] shadow-[0_0_0_1px_rgba(207,160,144,0.10),0_0_14px_rgba(207,160,144,0.18)]";
    }

    return "bg-[#c8d5e2] shadow-[0_0_0_1px_rgba(154,176,196,0.08)]";
}

function stageBadge(status: RoadmapStageStatus) {
    if (status === "completed") return "border-[#20a76b]/[0.22] bg-[#20a76b]/[0.09] text-[#0f7448]";
    if (status === "current") return "border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.09] text-[#1560bc]";
    if (status === "deferred") return "border-[#cfa090]/[0.28] bg-[#cfa090]/[0.09] text-[#8c5947]";
    return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.09] text-[#4e6880]";
}

function taskBadge(status: RoadmapTaskStatus) {
    if (status === "done") return "border-[#20a76b]/[0.22] bg-[#20a76b]/[0.09] text-[#0f7448]";
    if (status === "in_progress") return "border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.09] text-[#1560bc]";
    if (status === "pending") return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.09] text-[#4e6880]";
    if (status === "scheduled") return "border-[#8a65cc]/[0.26] bg-[#8a65cc]/[0.09] text-[#5e38a0]";
    if (status === "watch") return "border-[#d8b95f]/[0.30] bg-[#d8b95f]/[0.10] text-[#8a6b10]";
    if (status === "blocked") return "border-[#d66363]/[0.28] bg-[#d66363]/[0.10] text-[#9a3434]";
    if (status === "dropped") return "border-[#7f8a98]/[0.28] bg-[#7f8a98]/[0.10] text-[#586372]";
    if (status === "deferred") return "border-[#cfa090]/[0.28] bg-[#cfa090]/[0.09] text-[#8c5947]";
    return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.09] text-[#4e6880]";
}

type Props = {
    userName?: string | null;
    userAvatarUrl?: string | null;
    projectSlug?: string;
    projectTitle?: string;
    projectSubtitle?: string;
    projectLabel?: string;
    heroBadge?: string;
};

const TOP_FILTERS: { mode: FilterMode; label: string }[] = [
    { mode: "all", label: "Journey" },
    { mode: "current", label: "Current" },
    { mode: "upcoming", label: "Upcoming" },
    { mode: "completed", label: "Done" },
];

const SIDEBAR_FILTERS: { mode: FocusStatus; label: string }[] = [
    { mode: "current", label: "Current" },
    { mode: "upcoming", label: "Upcoming" },
    { mode: "completed", label: "Done" },
];

function matchesFocusedStatus(stageStatus: RoadmapStageStatus, focusedStatus: FocusStatus) {
    if (focusedStatus === "upcoming") {
        return stageStatus === "upcoming" || stageStatus === "deferred";
    }

    return stageStatus === focusedStatus;
}

export default function Unit19RoadmapWorkspace({
    projectSlug = PROPERTY_SLUG,
    projectTitle = "Unit 19 Project Roadmap",
    projectSubtitle = "Thessaloniki · Analipsi",
    projectLabel = "Unit 19",
    heroBadge = "Admin Roadmap",
}: Props) {

    const [managedPropertyId, setManagedPropertyId] = useState<string | null>(null);
    const [stages, setStages] = useState<Unit19RoadmapStage[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(() => new Set());
    const [filterMode, setFilterMode] = useState<FilterMode>("current");
    const [focusedStageStatus, setFocusedStageStatus] = useState<FocusStatus | null>(null);
    const [editingStageId, setEditingStageId] = useState<string | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [rearrangeMode, setRearrangeMode] = useState(false);
    const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
    const [scheduleDate, setScheduleDate] = useState(() => toIsoDate(new Date()));
    const [scheduleTime, setScheduleTime] = useState("");
    const [calendarTargetDate, setCalendarTargetDate] = useState<string | null>(null);
    const [calendarTargetItemId, setCalendarTargetItemId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [realEstateOpen, setRealEstateOpen] = useState(false);
    const [expensesOpen, setExpensesOpen] = useState(false);
    const [documentsOpen, setDocumentsOpen] = useState(false);
    const [incomeOpen, setIncomeOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const pendingDeletionRef = useRef<PendingDeletionRecord | null>(null);
    const [pendingDeletionLabel, setPendingDeletionLabel] = useState<string | null>(null);
    const rearrangingTasks = rearrangeMode && expandedStageIds.size > 0;

    const switchPanel = useCallback((panel: Unit19PanelKey) => {
        setRealEstateOpen(panel === "realEstate");
        setExpensesOpen(panel === "expenses");
        setDocumentsOpen(panel === "documents");
        setIncomeOpen(panel === "income");
        setCalendarOpen(panel === "calendar");
    }, []);

    const showRealEstatePanel = projectSlug === "unit-19";

    const queuePendingDeletion = useCallback((record: Omit<PendingDeletionRecord, "timeoutId">) => {
        const existing = pendingDeletionRef.current;
        if (existing) {
            window.clearTimeout(existing.timeoutId);
            void existing.commit();
        }

        const timeoutId = window.setTimeout(() => {
            const pending = pendingDeletionRef.current;
            if (!pending) return;

            pendingDeletionRef.current = null;
            setPendingDeletionLabel(null);
            void pending.commit();
        }, 5000);

        pendingDeletionRef.current = { ...record, timeoutId };
        setPendingDeletionLabel(record.label);
    }, []);

    const undoPendingDeletion = useCallback(() => {
        const pending = pendingDeletionRef.current;
        if (!pending) return;

        window.clearTimeout(pending.timeoutId);
        pendingDeletionRef.current = null;
        setPendingDeletionLabel(null);
        pending.undo();
    }, []);

    useEffect(() => {
        return () => {
            const pending = pendingDeletionRef.current;
            if (!pending) return;

            window.clearTimeout(pending.timeoutId);
            pendingDeletionRef.current = null;
            void pending.commit();
        };
    }, []);

    const loadRoadmap = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const property = await getManagedPropertyBySlug(projectSlug);
            const roadmap = await getManagedPropertyRoadmap(property.id);
            const mappedStages = mapRoadmapFromDb(roadmap.stages, roadmap.tasks);
            const currentStage = mappedStages.find((stage) => stage.status === "current") ?? mappedStages[0] ?? null;

            setManagedPropertyId(property.id);
            setStages(mappedStages);
            setSelectedStageId((current) => current ?? currentStage?.id ?? null);
            setExpandedStageIds((current) => current);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load roadmap data");
        } finally {
            setLoading(false);
        }
    }, [projectSlug]);

    useEffect(() => {
        void loadRoadmap();
    }, [loadRoadmap]);

    const visibleStages = useMemo(() => {
        if (filterMode === "all") return stages;
        if (filterMode === "current") return stages.filter((stage) => stage.status === "current");
        if (filterMode === "upcoming") return stages.filter((stage) => stage.status === "upcoming" || stage.status === "deferred");
        return stages.filter((stage) => stage.status === "completed");
    }, [filterMode, stages]);

    const taskTotals = useMemo(() => {
        const allTasks = stages.flatMap((stage) => stage.tasks);

        return {
            done: allTasks.filter((task) => task.status === "done").length,
            active: allTasks.filter((task) => ["pending", "scheduled", "open", "in_progress", "watch", "blocked"].includes(task.status)).length,
            total: allTasks.length,
        };
    }, [stages]);

    const projectMetricCards = useMemo(() => {
        if (projectSlug === "unit-19") {
            return unit19KeyMetrics
                .filter((metric) => metric.label !== "Progress")
                .map((metric) => ({
                    label: metric.label,
                    value:
                        metric.label === "Current focus"
                            ? "Post-acq."
                            : metric.label === "Active blockers"
                                ? `${taskTotals.active}`
                                : metric.value,
                    detail: metric.detail,
                }));
        }

        const currentStage =
            stages.find((stage) => stage.status === "current") ??
            stages.find((stage) => stage.tasks.some((task) => task.status === "in_progress")) ??
            stages[0];

        const currentStageTitle = currentStage?.title ?? "Roadmap setup";
        const activeTasks = stages
            .flatMap((stage) => stage.tasks)
            .filter((task) => ["in_progress", "scheduled", "open", "blocked"].includes(task.status));

        const activeTaskTitles = activeTasks
            .slice(0, 3)
            .map((task) => task.title)
            .join(", ");

        if (projectSlug === "maria-northstar") {
            return [
                {
                    label: "Current focus",
                    value: currentStageTitle,
                    detail: "2026 stability: Subway, DUO evidence, housing, exam, CV/LinkedIn",
                },
                {
                    label: "Target direction",
                    value: "HR / Recruitment",
                    detail: "Employer branding + communication bridge",
                },
                {
                    label: "Active focus",
                    value: `${activeTasks.length}`,
                    detail: activeTaskTitles || "No active focus items",
                },
            ];
        }

        return [
            {
                label: "Current focus",
                value: currentStageTitle,
                detail: "Current stage based on roadmap status",
            },
            {
                label: "Target model",
                value: projectLabel,
                detail: "Project-specific model and operating direction",
            },
            {
                label: "Active focus",
                value: `${activeTasks.length}`,
                detail: activeTaskTitles || "No active focus items",
            },
        ];
    }, [projectLabel, projectSlug, stages, taskTotals.active]);

    const progressPercent = Math.round((taskTotals.done / Math.max(taskTotals.total, 1)) * 100);

    function replaceTaskInState(task: Unit19RoadmapTask) {
        setStages((current) =>
            current.map((stage) => ({
                ...stage,
                tasks: stage.tasks.map((currentTask) => (currentTask.id === task.id ? task : currentTask)),
            })),
        );
    }

    function replaceStageInState(dbStage: ManagedPropertyRoadmapStage) {
        const parsed = parseStageTitle(dbStage.title);

        setStages((current) =>
            current.map((stage) =>
                stage.id === dbStage.id
                    ? {
                        ...stage,
                        stableKey: dbStage.stable_key,
                        number: parsed.number,
                        title: parsed.title,
                        status: dbStage.status,
                        summary: dbStage.description ?? "",
                        sortOrder: dbStage.sort_order,
                    }
                    : stage,
            ),
        );
    }

    function updateStage(stageId: string, patch: Partial<Unit19RoadmapStage>) {
        setStages((current) =>
            current.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
        );
    }

    function getOrderedStages(stageList = stages) {
        return [...stageList].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    }

    function renumberStages(stageList: Unit19RoadmapStage[]) {
        return stageList.map((stage, index) => ({
            ...stage,
            number: formatStageNumber(index + 1),
            sortOrder: (index + 1) * 1000,
        }));
    }

    async function persistStageOrder(stageList: Unit19RoadmapStage[]) {
        await Promise.all(
            stageList.map((stage) =>
                updateManagedPropertyRoadmapStage(stage.dbStageId, {
                    title: buildStageTitle(stage.number, stage.title),
                    description: stage.summary?.trim() || null,
                    status: stage.status,
                    sort_order: stage.sortOrder,
                }),
            ),
        );
    }

    async function persistTaskOrder(stageId: string, taskList: Unit19RoadmapTask[]) {
        await Promise.all(
            taskList.map((task, index) =>
                updateManagedPropertyTask(task.id, { sort_order: (index + 1) * 1000 }),
            ),
        );
        setStages((current) =>
            current.map((stage) =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: taskList.map((task, index) => ({ ...task, sort_order: (index + 1) * 1000 })),
                    }
                    : stage,
            ),
        );
    }

    async function addStage() {
        if (!managedPropertyId) return;

        setSaving(true);
        setError(null);

        try {
            const orderedStages = getOrderedStages();
            const selectedIndex = selectedStageId
                ? orderedStages.findIndex((stage) => stage.id === selectedStageId)
                : -1;
            const insertIndex = selectedIndex >= 0 ? selectedIndex : orderedStages.length;
            const initialNumber = formatStageNumber(insertIndex + 1);

            const dbStage = await createManagedPropertyRoadmapStage({
                managed_property_id: managedPropertyId,
                stable_key: createStageStableKey(),
                title: buildStageTitle(initialNumber, "New stage"),
                description: "Describe this stage.",
                status: "upcoming",
                sort_order: (insertIndex + 1) * 1000,
            });
            const parsed = parseStageTitle(dbStage.title);
            const newStage: Unit19RoadmapStage = {
                id: dbStage.id,
                dbStageId: dbStage.id,
                stableKey: dbStage.stable_key,
                number: parsed.number,
                title: parsed.title,
                status: dbStage.status,
                summary: dbStage.description ?? "",
                lesson: "Use this stage as the working layer for execution, scheduling and follow-up.",
                sortOrder: dbStage.sort_order,
                tasks: [],
            };

            const nextStages = renumberStages([
                ...orderedStages.slice(0, insertIndex),
                newStage,
                ...orderedStages.slice(insertIndex),
            ]);

            await persistStageOrder(nextStages);

            setStages(nextStages);
            setSelectedStageId(newStage.id);
            setEditingStageId(newStage.id);
            setFilterMode("all");
            setFocusedStageStatus(null);
            setExpandedStageIds((current) => {
                const next = new Set(current);
                next.add(newStage.id);
                return next;
            });

            window.setTimeout(() => {
                document.getElementById(`roadmap-stage-${newStage.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 80);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create roadmap stage");
        } finally {
            setSaving(false);
        }
    }

    async function saveStage(stage: Unit19RoadmapStage) {
        const normalizedNumber = normalizeStageNumber(stage.number);

        if (!normalizedNumber) {
            setError("Stage number must be a positive number.");
            return;
        }

        const duplicateStage = stages.find((item) => item.id !== stage.id && item.number === normalizedNumber);

        if (duplicateStage) {
            setError(`Stage number ${normalizedNumber} is already used by "${duplicateStage.title}".`);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const dbStage = await updateManagedPropertyRoadmapStage(stage.dbStageId, {
                title: buildStageTitle(normalizedNumber, stage.title),
                description: stage.summary?.trim() || null,
                status: stage.status,
                sort_order: stage.sortOrder,
            });

            replaceStageInState({ ...dbStage, title: buildStageTitle(normalizedNumber, stage.title) });
            setEditingStageId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save roadmap stage");
        } finally {
            setSaving(false);
        }
    }

    function removeStage(stage: Unit19RoadmapStage) {
        if (stage.tasks.length > 0) {
            setError("Only empty stages can be deleted. Delete or move the tasks first.");
            return;
        }

        const previousStages = stages;
        const previousExpandedStageIds = expandedStageIds;
        const previousEditingStageId = editingStageId;
        const previousSelectedStageId = selectedStageId;
        const nextStages = renumberStages(getOrderedStages().filter((item) => item.id !== stage.id));

        setError(null);
        setStages(nextStages);
        setExpandedStageIds((current) => {
            const next = new Set(current);
            next.delete(stage.id);
            return next;
        });
        setEditingStageId((current) => (current === stage.id ? null : current));
        setSelectedStageId((current) => (current === stage.id ? nextStages[0]?.id ?? null : current));

        queuePendingDeletion({
            label: `Stage deleted: ${stage.title}`,
            undo: () => {
                setStages(previousStages);
                setExpandedStageIds(previousExpandedStageIds);
                setEditingStageId(previousEditingStageId);
                setSelectedStageId(previousSelectedStageId);
            },
            commit: async () => {
                setSaving(true);
                setError(null);

                try {
                    await deleteManagedPropertyRoadmapStage(stage.dbStageId);
                    await persistStageOrder(nextStages);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete roadmap stage");
                    setStages(previousStages);
                    setExpandedStageIds(previousExpandedStageIds);
                    setEditingStageId(previousEditingStageId);
                    setSelectedStageId(previousSelectedStageId);
                } finally {
                    setSaving(false);
                }
            },
        });
    }

    function toggleRearrangeMode() {
        setRearrangeMode((current) => {
            const next = !current;

            if (next) {
                if (expandedStageIds.size === 0) {
                    setFilterMode("all");
                    setFocusedStageStatus(null);
                }
                setEditingStageId(null);
                setEditingTaskId(null);
            }

            return next;
        });
    }

    async function reorderStage(draggedId: string, targetId: string) {
        if (draggedId === targetId) return;

        const orderedStages = getOrderedStages();
        const draggedIndex = orderedStages.findIndex((stage) => stage.id === draggedId);
        const targetIndex = orderedStages.findIndex((stage) => stage.id === targetId);

        if (draggedIndex < 0 || targetIndex < 0) return;

        const nextOrder = [...orderedStages];
        const [draggedStage] = nextOrder.splice(draggedIndex, 1);
        nextOrder.splice(targetIndex, 0, draggedStage);

        const nextStages = renumberStages(nextOrder);
        setStages(nextStages);
        setSelectedStageId(draggedId);
        setSaving(true);
        setError(null);

        try {
            await persistStageOrder(nextStages);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder roadmap stages");
            await loadRoadmap();
        } finally {
            setSaving(false);
        }
    }

    function toggleExpanded(id: string) {
        setExpandedStageIds((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function collapseAll() {
        setFocusedStageStatus(null);
        setExpandedStageIds(new Set());
    }

    function scrollToTop() {
        setFocusedStageStatus(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function focusStageStatus(status: FocusStatus) {
        setFilterMode("all");
        setFocusedStageStatus(status);

        const matchingStages = stages.filter((stage) => matchesFocusedStatus(stage.status, status));
        const targetStage =
            status === "completed"
                ? matchingStages[matchingStages.length - 1]
                : matchingStages[0];

        if (!targetStage) return;

        setSelectedStageId(targetStage.id);

        window.setTimeout(() => {
            document.getElementById(`roadmap-stage-${targetStage.id}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 40);
    }

    function selectStage(id: string) {
        setSelectedStageId(id);
        setExpandedStageIds((current) => {
            const next = new Set(current);
            next.add(id);
            return next;
        });
    }

    async function reorderTask(stageId: string, draggedId: string, targetId: string) {
        if (draggedId === targetId) return;

        const stage = stages.find((item) => item.id === stageId);
        if (!stage) return;

        const tasks = [...stage.tasks].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
        const draggedIndex = tasks.findIndex((task) => task.id === draggedId);
        const targetIndex = tasks.findIndex((task) => task.id === targetId);
        if (draggedIndex < 0 || targetIndex < 0) return;

        const nextTasks = [...tasks];
        const [draggedTask] = nextTasks.splice(draggedIndex, 1);
        nextTasks.splice(targetIndex, 0, draggedTask);

        setStages((current) =>
            current.map((item) => (item.id === stageId ? { ...item, tasks: nextTasks } : item)),
        );
        setSaving(true);
        setError(null);
        try {
            await persistTaskOrder(stageId, nextTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reorder roadmap tasks");
            await loadRoadmap();
        } finally {
            setSaving(false);
        }
    }

    async function addTask(stageId: string) {
        if (!managedPropertyId) return;

        const stage = stages.find((item) => item.id === stageId);
        if (!stage) return;

        setSaving(true);
        setError(null);

        try {
            const sortOrder = Math.max(0, ...stage.tasks.map((task) => task.sort_order ?? 0)) + 1000;
            const task = await createManagedPropertyTask({
                managed_property_id: managedPropertyId,
                stage_id: stage.dbStageId,
                stable_key: null,
                title: "Нова задача",
                note: "Добави кратка бележка.",
                status: "open",
                priority: "normal",
                due_date: null,
                sort_order: sortOrder,
            });

            setStages((current) =>
                current.map((currentStage) =>
                    currentStage.id === stageId ? { ...currentStage, tasks: [...currentStage.tasks, task] } : currentStage,
                ),
            );
            setEditingTaskId(task.id);
            setExpandedStageIds((current) => {
                const next = new Set(current);
                next.add(stageId);
                return next;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create roadmap task");
        } finally {
            setSaving(false);
        }
    }

    function removeTask(stageId: string, taskId: string) {
        const stage = stages.find((item) => item.id === stageId);
        const task = stage?.tasks.find((item) => item.id === taskId);
        if (!stage || !task) return;

        const previousStages = stages;
        const previousEditingTaskId = editingTaskId;

        setError(null);
        setStages((current) =>
            current.map((currentStage) =>
                currentStage.id === stageId ? { ...currentStage, tasks: currentStage.tasks.filter((item) => item.id !== taskId) } : currentStage,
            ),
        );
        if (editingTaskId === taskId) setEditingTaskId(null);

        queuePendingDeletion({
            label: `Task deleted: ${task.title}`,
            undo: () => {
                setStages(previousStages);
                setEditingTaskId(previousEditingTaskId);
            },
            commit: async () => {
                setSaving(true);
                setError(null);

                try {
                    await deleteManagedPropertyTask(taskId);
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete roadmap task");
                    setStages(previousStages);
                    setEditingTaskId(previousEditingTaskId);
                } finally {
                    setSaving(false);
                }
            },
        });
    }

    function updateTask(stageId: string, taskId: string, patch: Partial<Unit19RoadmapTask>) {
        setStages((current) =>
            current.map((stage) =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: stage.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
                    }
                    : stage,
            ),
        );
    }

    async function saveTask(task: Unit19RoadmapTask) {
        setSaving(true);
        setError(null);

        try {
            const savedTask = await updateManagedPropertyTask(task.id, {
                title: task.title,
                note: task.note,
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
                completed_at: task.status === "done" ? task.completed_at ?? new Date().toISOString() : null,
            });

            replaceTaskInState(savedTask);
            setEditingTaskId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save roadmap task");
        } finally {
            setSaving(false);
        }
    }

    function startSchedule(task: Unit19RoadmapTask) {
        setSchedulingTaskId(task.id);
        setScheduleDate(task.due_date ?? toIsoDate(new Date()));
        setScheduleTime("");
    }

    async function saveSchedule(task: Unit19RoadmapTask) {
        if (!managedPropertyId) return;

        setSaving(true);
        setError(null);

        try {
            const result = await scheduleManagedPropertyTask({
                managedPropertyId,
                task,
                itemDate: scheduleDate,
                itemTime: scheduleTime,
            });

            replaceTaskInState(result.task);
            setSchedulingTaskId(null);
            setCalendarTargetDate(result.calendarItem.item_date);
            setCalendarTargetItemId(result.calendarItem.id);
            setCalendarOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to schedule roadmap task");
        } finally {
            setSaving(false);
        }
    }

    function openCalendarForTask(task: Unit19RoadmapTask) {
        setCalendarTargetDate(task.due_date ?? toIsoDate(new Date()));
        setCalendarTargetItemId(task.calendar_item_id);
        setCalendarOpen(true);
    }

    return (
        <section className="relative -mx-10 -mb-12 -mt-38 min-h-screen overflow-hidden bg-[#edf3fa] px-4 pb-14 pt-24 text-[#0f1c2e] sm:px-5">
            <div className="pointer-events-none absolute inset-0">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
                    style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#edf3fa]/[0.92] via-[#edf3fa]/[0.68] to-[#e6eff8]/[0.10]" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.14] via-transparent to-[#e0ecf8]/[0.36]" />
            </div>

            <div className="relative mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[104px_minmax(0,1fr)]">
                <aside className="hidden lg:fixed lg:left-[max(1.25rem,calc((100vw-1480px)/2+1.25rem))] lg:top-[88px] lg:z-40 lg:block lg:w-[104px]">
                    <div className="flex max-h-[calc(100vh-136px)] flex-col justify-between overflow-y-auto rounded-[24px] border border-white/[0.88] bg-white/[0.68] p-2.5 shadow-[0_18px_56px_rgba(41,73,112,0.12),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-2xl">
                        <div className="flex flex-col items-center gap-2">
                            <Link href="/" className="mb-1 mt-1 flex justify-center">
                                <Image
                                    src="/logo_no_backgr.png"
                                    alt="Epitropos"
                                    width={68}
                                    height={46}
                                    priority
                                    className="h-auto w-14 object-contain"
                                />
                            </Link>

                            <button
                                type="button"
                                onClick={() => void addStage()}
                                disabled={saving || !managedPropertyId}
                                className="group flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-[#20a76b]/[0.26] bg-[#20a76b]/[0.09] px-2 py-2.5 text-[10px] font-semibold whitespace-nowrap text-[#0f7448] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#20a76b]/[0.38] hover:bg-[#20a76b]/[0.14] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(32,167,107,0.12)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.96]"
                            >
                                <IconPlus c="h-4 w-4" />
                                Stage
                            </button>

                            <nav className="flex w-full flex-col gap-1.5" aria-label="Roadmap stage focus navigation">
                                {SIDEBAR_FILTERS.map(({ mode, label }) => {
                                    const active = focusedStageStatus === mode;
                                    const Icon =
                                        mode === "current"
                                            ? IconClock
                                            : mode === "upcoming"
                                                ? IconTrend
                                                : IconCheckSquare;

                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => focusStageStatus(mode)}
                                            aria-pressed={active}
                                            className={[
                                                "group flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[10px] font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]/40 active:scale-[0.96]",
                                                active
                                                    ? "border-[#2f80ed]/[0.36] bg-[#2f80ed] text-white shadow-[0_14px_30px_rgba(47,128,237,0.26)]"
                                                    : "border-white/[0.72] bg-white/[0.42] text-[#6f849d] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.26] hover:bg-white/[0.82] hover:text-[#2060cc] hover:shadow-[0_10px_24px_rgba(41,73,112,0.10)]",
                                            ].join(" ")}
                                        >
                                            <Icon c="h-4 w-4" />
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="grid w-full grid-cols-1 gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={collapseAll}
                                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.74] bg-white/[0.46] px-2 py-2.5 text-[9.5px] font-semibold text-[#6f849d] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.26] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                                >
                                    <IconCollapse c="h-4 w-4" />
                                    Collapse
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleRearrangeMode}
                                    aria-pressed={rearrangeMode}
                                    className={[
                                        "flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[9.5px] font-semibold transition-all duration-300 active:scale-[0.96]",
                                        rearrangeMode
                                            ? "border-[#8a65cc]/[0.36] bg-[#8a65cc] text-white shadow-[0_14px_30px_rgba(138,101,204,0.24)]"
                                            : "border-white/[0.74] bg-white/[0.46] text-[#6f849d] hover:-translate-y-0.5 hover:border-[#8a65cc]/[0.26] hover:bg-white/[0.86] hover:text-[#5e38a0]",
                                    ].join(" ")}
                                >
                                    <IconCollapse c="h-4 w-4" />
                                    Rearrange
                                </button>
                                <button
                                    type="button"
                                    onClick={scrollToTop}
                                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.74] bg-white/[0.46] px-2 py-2.5 text-[9.5px] font-semibold text-[#6f849d] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.26] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                                >
                                    <IconArrowUp c="h-4 w-4" />
                                    Top
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="space-y-5 lg:col-start-2 lg:min-w-0">
                    <header className="relative overflow-hidden rounded-[28px] border border-white/[0.78] bg-white/[0.55] shadow-[0_24px_90px_rgba(41,73,112,0.11),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                        <div
                            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70 saturate-[1.28] contrast-[1.12]"
                            style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.50] via-white/[0.16] to-white/[0.00]" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-[#edf3fa]/[0.20]" />
                        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-white/[0.10] blur-3xl" />
                        <div className="pointer-events-none absolute right-10 top-8 h-56 w-56 rounded-full bg-[#2f80ed]/[0.05] blur-3xl" />

                        <div className="relative p-7 md:p-9">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-[#2f80ed]/[0.22] bg-[#2f80ed]/[0.09] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">
                                    {heroBadge}
                                </span>
                                <span className="text-[#b8c9d8]">/</span>
                                <span className="rounded-full border border-black/[0.08] bg-white/[0.52] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a90a8]">
                                    Private Workspace
                                </span>
                            </div>

                            <h1 className="font-display text-[38px] font-normal leading-[0.98] tracking-[-0.025em] text-[#0b1623] md:text-[54px]">
                                {projectTitle}
                            </h1>
                            <p className="mt-2.5 text-[15px] text-[#3d5270] md:text-[17px]">
                                {projectSubtitle}
                            </p>

                            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="col-span-2 rounded-[18px] border border-white/[0.85] bg-white/[0.76] p-4 shadow-[0_12px_38px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(47,128,237,0.10)] sm:col-span-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2f80ed]/[0.14] bg-[#2f80ed]/[0.09] text-[#2060cc]">
                                            <IconClock />
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Overall Progress</span>
                                    </div>
                                    <div className="text-[26px] font-semibold leading-none text-[#0b1623]">{progressPercent}%</div>
                                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#d8e8f6]">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#2f80ed] to-[#5499f8] transition-all duration-700"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="mt-1.5 text-[11px] text-[#7a90a8]">{taskTotals.done} / {taskTotals.total} tasks</div>
                                </div>

                                {projectMetricCards.map((metric, index) => {
                                    const metricIcons = [IconCalendar, IconTrend, IconCheckSquare];
                                    const MetricIcon = metricIcons[index] ?? IconClock;

                                    return (
                                        <div
                                            key={metric.label}
                                            className="rounded-[18px] border border-white/[0.85] bg-white/[0.76] p-4 shadow-[0_12px_38px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(47,128,237,0.10)]"
                                        >
                                            <div className="mb-2 flex items-center gap-2">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2f80ed]/[0.14] bg-[#2f80ed]/[0.09] text-[#2060cc]">
                                                    <MetricIcon />
                                                </div>
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{metric.label}</span>
                                            </div>
                                            <div className="break-words text-[22px] font-semibold leading-tight text-[#0b1623]">{metric.value}</div>
                                            <div className="mt-1.5 text-[11px] leading-[1.35] text-[#7a90a8]">{metric.detail}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </header>

                    <section className="rounded-[26px] border border-white/[0.80] bg-white/[0.62] p-5 shadow-[0_20px_70px_rgba(41,73,112,0.09),inset_0_1px_0_rgba(255,255,255,0.97)] backdrop-blur-2xl sm:p-6">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="font-display text-[22px] font-normal tracking-[-0.01em] text-[#0b1623]">
                                    Project Stages
                                </h2>
                                <p className="mt-0.5 text-[13px] text-[#7a90a8]">
                                    Complete journey from motivation to stable ownership
                                </p>
                            </div>

                            <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-[18px] border border-white/[0.78] bg-white/[0.44] p-1.5 shadow-[0_12px_36px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl">
                                {TOP_FILTERS.map(({ mode, label }) => {
                                    const active = filterMode === mode;

                                    return (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => {
                                                setFocusedStageStatus(null);
                                                setFilterMode(mode);
                                            }}
                                            aria-pressed={active}
                                            className={[
                                                "relative overflow-hidden rounded-[12px] border px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]/40 active:scale-[0.96]",
                                                active
                                                    ? "border-[#2f80ed]/[0.38] bg-[#2f80ed] text-white shadow-[0_12px_28px_rgba(47,128,237,0.28)]"
                                                    : "border-transparent bg-white/[0.38] text-[#4e6880] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:-translate-y-0.5 hover:border-white/[0.88] hover:bg-white/[0.78] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(41,73,112,0.10)]",
                                            ].join(" ")}
                                        >
                                            <span className="relative z-10">{label}</span>
                                            {active ? (
                                                <span className="pointer-events-none absolute inset-x-3 bottom-1 h-px rounded-full bg-white/[0.55]" />
                                            ) : null}
                                        </button>
                                    );
                                })}

                                <span className="mx-1 hidden h-7 w-px bg-[#ccd9e8]/80 sm:block" />

                                {showRealEstatePanel ? (
                                    <button
                                        type="button"
                                        onClick={() => switchPanel("realEstate")}
                                        className="relative overflow-hidden rounded-[12px] border border-[#0f2a47]/[0.22] bg-[#0f2a47]/[0.08] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[#0f2a47] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#0f2a47]/[0.36] hover:bg-[#0f2a47]/[0.13] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(15,42,71,0.14)] active:scale-[0.96]"
                                    >
                                        Property
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={() => switchPanel("expenses")}
                                    className="relative overflow-hidden rounded-[12px] border border-[#a68b4a]/[0.28] bg-[#a68b4a]/[0.10] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[#7a6228] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#a68b4a]/[0.42] hover:bg-[#a68b4a]/[0.16] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(166,139,74,0.18)] active:scale-[0.96]"
                                >
                                    Expenses
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchPanel("documents")}
                                    className="relative overflow-hidden rounded-[12px] border border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.09] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[#1560bc] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.40] hover:bg-[#2f80ed]/[0.14] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(47,128,237,0.16)] active:scale-[0.96]"
                                >
                                    Documents
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchPanel("income")}
                                    className="relative overflow-hidden rounded-[12px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[#0f7448] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#20a76b]/[0.34] hover:bg-[#20a76b]/[0.13] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(32,167,107,0.14)] active:scale-[0.96]"
                                >
                                    Budget
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchPanel("calendar")}
                                    className="relative overflow-hidden rounded-[12px] border border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.08] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[#5e38a0] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#8a65cc]/[0.34] hover:bg-[#8a65cc]/[0.13] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(138,101,204,0.14)] active:scale-[0.96]"
                                >
                                    Calendar
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <div className="mb-4 rounded-[14px] border border-[#d96969]/[0.24] bg-[#d96969]/[0.08] px-4 py-3 text-[12px] font-semibold text-[#9d2f2f]">
                                {error}
                            </div>
                        ) : null}

                        {loading ? (
                            <div className="mb-4 rounded-[14px] border border-[#2f80ed]/[0.22] bg-[#2f80ed]/[0.08] px-4 py-3 text-[12px] font-semibold text-[#1560bc]">
                                Loading DB roadmap...
                            </div>
                        ) : null}

                        {rearrangeMode ? (
                            <div className="mb-4 rounded-[14px] border border-[#8a65cc]/[0.22] bg-[#8a65cc]/[0.08] px-4 py-3 text-[12px] font-semibold text-[#5e38a0]">
                                {rearrangingTasks ? "Rearrange mode is active. Drag tasks inside the expanded stage to reorder." : "Rearrange mode is active. Drag stages to reorder. Stage numbers will be updated automatically."}
                            </div>
                        ) : null}

                        {pendingDeletionLabel ? (
                            <div className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[18px] border border-[#c78973]/[0.28] bg-white/[0.90] px-4 py-3 text-[12px] font-semibold text-[#8c5947] shadow-[0_24px_70px_rgba(6,16,29,0.22)] backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="min-w-0">{pendingDeletionLabel}. Undo available.</span>
                                    <button
                                        type="button"
                                        onClick={undoPendingDeletion}
                                        className="shrink-0 rounded-[9px] border border-[#c78973]/[0.30] bg-white/[0.72] px-3 py-1.5 text-[11px] font-semibold text-[#8c5947] transition hover:bg-white active:scale-[0.97]"
                                    >
                                        Undo
                                    </button>
                                </div>
                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#c78973]/[0.14]">
                                    <div className="h-full origin-left rounded-full bg-[#c78973]" style={{ animation: "roadmap-delete-countdown 5s linear forwards" }} />
                                </div>
                                <style jsx>{`@keyframes roadmap-delete-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
                            </div>
                        ) : null}

                        <div className="relative pl-0 md:pl-[72px]">
                            <div className="space-y-3">
                                {visibleStages.map((stage, index) => {
                                    const selected = stage.id === selectedStageId;
                                    const expanded = expandedStageIds.has(stage.id);
                                    const activeTasks = stage.tasks.filter((task) =>
                                        ["pending", "scheduled", "open", "in_progress", "watch", "blocked"].includes(task.status),
                                    );

                                    return (
                                        <article
                                            id={`roadmap-stage-${stage.id}`}
                                            key={stage.id}
                                            draggable={rearrangeMode && !rearrangingTasks}
                                            onDragStart={(event) => {
                                                if (!rearrangeMode || rearrangingTasks || isInteractiveField(event.target)) return;
                                                setDraggedStageId(stage.id);
                                                event.dataTransfer.effectAllowed = "move";
                                                event.dataTransfer.setData("text/plain", stage.id);
                                            }}
                                            onDragOver={(event) => {
                                                if (!rearrangeMode || rearrangingTasks) return;
                                                event.preventDefault();
                                                event.dataTransfer.dropEffect = "move";
                                            }}
                                            onDrop={(event) => {
                                                if (!rearrangeMode || rearrangingTasks) return;
                                                event.preventDefault();
                                                const draggedId = draggedStageId ?? event.dataTransfer.getData("text/plain");
                                                setDraggedStageId(null);
                                                void reorderStage(draggedId, stage.id);
                                            }}
                                            onDragEnd={() => setDraggedStageId(null)}
                                            className={[
                                                "relative rounded-[17px] border transition-all duration-300 backdrop-blur-xl",
                                                rearrangeMode ? "cursor-grab active:cursor-grabbing" : "",
                                                draggedStageId === stage.id ? "opacity-50 ring-2 ring-[#8a65cc]/[0.28]" : "",
                                                stageCard(stage.status, selected),
                                                focusedStageStatus && !matchesFocusedStatus(stage.status, focusedStageStatus)
                                                    ? "opacity-[0.34] saturate-[0.55] blur-[0.2px]"
                                                    : "",
                                                focusedStageStatus && matchesFocusedStatus(stage.status, focusedStageStatus)
                                                    ? "ring-1 ring-[#2f80ed]/[0.24]"
                                                    : "",
                                            ].join(" ")}
                                        >
                                            {index < visibleStages.length - 1 ? (
                                                <div
                                                    className={[
                                                        "pointer-events-none absolute -left-[38px] top-[46px] -bottom-[18px] hidden w-[2px] rounded-full transition-colors duration-500 md:block",
                                                        stageConnector(stage.status),
                                                    ].join(" ")}
                                                />
                                            ) : null}

                                            <div className="absolute -left-[55px] top-4 z-10 hidden h-9 w-9 items-center justify-center rounded-full bg-white/[0.72] shadow-[0_6px_18px_rgba(41,73,112,0.12)] backdrop-blur-md transition-all duration-300 md:flex">
                                                <div className={["flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300", stageMarker(stage.status, selected)].join(" ")}>
                                                    {stage.status === "completed" ? (
                                                        <IconCheck />
                                                    ) : stage.status === "current" ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                                    ) : stage.status === "deferred" ? (
                                                        <span className="text-[11px] font-bold leading-none">!</span>
                                                    ) : (
                                                        <div className="h-2 w-2 rounded-full border border-current opacity-45" />
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className="flex cursor-pointer items-start gap-3 px-4 py-3.5"
                                                role="button"
                                                tabIndex={0}
                                                onClick={(event) => {
                                                    if (rearrangeMode || isInteractiveField(event.target)) return;

                                                    if (expanded && selected) {
                                                        toggleExpanded(stage.id);
                                                        return;
                                                    }

                                                    selectStage(stage.id);
                                                }}
                                                onKeyDown={(event) => {
                                                    if (rearrangeMode || isInteractiveField(event.target)) return;

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
                                                <span
                                                    className={[
                                                        "hidden min-w-[26px] pt-0.5 text-[13px] font-bold tabular-nums leading-tight md:block",
                                                        selected || stage.status === "current"
                                                            ? "text-[#2060cc]"
                                                            : stage.status === "completed"
                                                                ? "text-[#8fa8c0]"
                                                                : "text-[#9ab0c4]",
                                                    ].join(" ")}
                                                >
                                                    {stage.number}
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    {editingStageId === stage.id ? (
                                                        <div className="space-y-2.5 rounded-[14px] border border-[#2f80ed]/[0.18] bg-white/[0.58] p-3" onClick={(event) => event.stopPropagation()}>
                                                            <div className="grid gap-2 sm:grid-cols-[80px_minmax(0,1fr)_150px]">
                                                                <label className="block text-[10.5px] font-semibold text-[#607993]">
                                                                    No.
                                                                    <input
                                                                        value={stage.number}
                                                                        onChange={(event) => updateStage(stage.id, { number: event.target.value })}
                                                                        className="mt-1 w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.90] px-2.5 py-2 text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                    />
                                                                    {normalizeStageNumber(stage.number) && stages.some((item) => item.id !== stage.id && item.number === normalizeStageNumber(stage.number)) ? (
                                                                        <span className="mt-1 block text-[9.5px] font-semibold text-[#9d2f2f]">Number already used</span>
                                                                    ) : null}
                                                                </label>
                                                                <label className="block text-[10.5px] font-semibold text-[#607993]">
                                                                    Stage title
                                                                    <input
                                                                        value={stage.title}
                                                                        onChange={(event) => updateStage(stage.id, { title: event.target.value })}
                                                                        className="mt-1 w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.90] px-3 py-2 text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                    />
                                                                </label>
                                                                <label className="block text-[10.5px] font-semibold text-[#607993]">
                                                                    Status
                                                                    <select
                                                                        value={stage.status}
                                                                        onChange={(event) => updateStage(stage.id, { status: event.target.value as RoadmapStageStatus })}
                                                                        className="mt-1 w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.90] px-3 py-2 text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                    >
                                                                        <option value="completed">Completed</option>
                                                                        <option value="current">In Progress</option>
                                                                        <option value="upcoming">Upcoming</option>
                                                                        <option value="deferred">Deferred</option>
                                                                    </select>
                                                                </label>
                                                            </div>
                                                            <label className="block text-[10.5px] font-semibold text-[#607993]">
                                                                Summary
                                                                <textarea
                                                                    value={stage.summary}
                                                                    onChange={(event) => updateStage(stage.id, { summary: event.target.value })}
                                                                    rows={2}
                                                                    className="mt-1 w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.90] px-3 py-2 text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                />
                                                            </label>
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingStageId(null)}
                                                                    className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.62] px-3 py-2 text-[11px] font-semibold text-[#607993] transition hover:bg-white/[0.86] active:scale-[0.97]"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void saveStage(stage)}
                                                                    disabled={saving}
                                                                    className="rounded-[9px] bg-[#2f80ed] px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-[#236fcc] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
                                                                >
                                                                    Save stage
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex flex-wrap items-baseline gap-2">
                                                                <h3 className="text-[13.5px] font-semibold leading-snug text-[#0b1623]">
                                                                    {stage.title}
                                                                </h3>
                                                                <span className="text-[11px] font-semibold text-[#9ab0c4] md:hidden">
                                                                    #{stage.number}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 text-[12px] leading-[1.55] text-[#7a90a8]">
                                                                {stage.summary}
                                                            </p>
                                                        </>
                                                    )}

                                                    {expanded ? (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="grid grid-cols-3 gap-3 rounded-[12px] border border-[#d8e8f6]/[0.75] bg-[#f0f6fd]/[0.70] px-3.5 py-3">
                                                                <div>
                                                                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Active Tasks</div>
                                                                    <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{activeTasks.length}</div>
                                                                </div>
                                                                <div className="border-l border-[#d8e8f6] pl-3">
                                                                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Stage Status</div>
                                                                    <div className="mt-1 text-[13px] font-semibold text-[#0b1623]">{getStageLabel(stage.status)}</div>
                                                                </div>
                                                                <div className="border-l border-[#d8e8f6] pl-3">
                                                                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Total Tasks</div>
                                                                    <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{stage.tasks.length}</div>
                                                                </div>
                                                            </div>

                                                            {stage.tasks.length > 0 ? (
                                                                <div>
                                                                    <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">
                                                                        Active Tasks
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {stage.tasks.map((task) => {
                                                                            const editing = editingTaskId === task.id;

                                                                            return (
                                                                                <div
                                                                                    key={task.id}
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        setSelectedStageId(stage.id);
                                                                                    }}
                                                                                    onDoubleClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                        setEditingTaskId(task.id);
                                                                                    }}
                                                                                    onKeyDown={(event) => {
                                                                                        if (isInteractiveField(event.target)) return;

                                                                                        if (event.key === "Enter") {
                                                                                            event.preventDefault();
                                                                                            event.stopPropagation();
                                                                                            setEditingTaskId(task.id);
                                                                                        }
                                                                                    }}
                                                                                    draggable={rearrangingTasks}
                                                                                    onDragStart={(event) => {
                                                                                        if (!rearrangingTasks || isInteractiveField(event.target)) return;
                                                                                        event.stopPropagation();
                                                                                        setDraggedTaskId(task.id);
                                                                                        event.dataTransfer.effectAllowed = "move";
                                                                                    }}
                                                                                    onDragOver={(event) => {
                                                                                        if (!rearrangingTasks) return;
                                                                                        event.preventDefault();
                                                                                        event.stopPropagation();
                                                                                    }}
                                                                                    onDrop={(event) => {
                                                                                        if (!rearrangingTasks || !draggedTaskId) return;
                                                                                        event.preventDefault();
                                                                                        event.stopPropagation();
                                                                                        void reorderTask(stage.id, draggedTaskId, task.id);
                                                                                        setDraggedTaskId(null);
                                                                                    }}
                                                                                    onDragEnd={() => setDraggedTaskId(null)}
                                                                                    className={[
                                                                                        "rounded-[12px] border border-[#d8e8f6]/80 bg-white/[0.72] px-3.5 py-3 outline-none transition hover:border-[#2f80ed]/[0.24] hover:bg-white/[0.84] focus:border-[#2f80ed]/[0.34] focus:ring-2 focus:ring-[#2f80ed]/[0.10]",
                                                                                        rearrangingTasks ? "cursor-grab active:cursor-grabbing" : "",
                                                                                    ].join(" ")}
                                                                                >
                                                                                    {editing ? (
                                                                                        <div className="space-y-2.5">
                                                                                            <input
                                                                                                value={task.title}
                                                                                                onChange={(event) => updateTask(stage.id, task.id, { title: event.target.value })}
                                                                                                className="w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.92] px-3 py-2 text-[13px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                                                                            />
                                                                                            <textarea
                                                                                                value={task.note ?? ""}
                                                                                                onChange={(event) => updateTask(stage.id, task.id, { note: event.target.value })}
                                                                                                rows={2}
                                                                                                className="w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.92] px-3 py-2 text-[13px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                                                                            />
                                                                                            <select
                                                                                                value={task.status}
                                                                                                onChange={(event) => updateTask(stage.id, task.id, { status: event.target.value as RoadmapTaskStatus })}
                                                                                                className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.92] px-3 py-2 text-[13px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                                            >
                                                                                                <option value="done">Done</option>
                                                                                                <option value="in_progress">In progress</option>
                                                                                                <option value="pending">Planned</option>
                                                                                                <option value="scheduled">Scheduled</option>
                                                                                                <option value="open">Todo</option>
                                                                                                <option value="watch">Watch</option>
                                                                                                <option value="blocked">Blocked</option>
                                                                                                <option value="deferred">Deferred</option>
                                                                                                <option value="dropped">Dropped</option>
                                                                                            </select>
                                                                                            <div className="flex justify-end">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => void saveTask(task)}
                                                                                                    disabled={saving}
                                                                                                    className="rounded-[9px] bg-[#2f80ed] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#236fcc] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
                                                                                                >
                                                                                                    Save
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-start gap-3">
                                                                                            <div
                                                                                                className={[
                                                                                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                                                                                    task.status === "done"
                                                                                                        ? "border-2 border-[#20a76b] bg-[#20a76b]"
                                                                                                        : task.status === "in_progress"
                                                                                                            ? "border-2 border-[#2f80ed] bg-transparent"
                                                                                                            : "border-2 border-[#c8d5e2] bg-transparent",
                                                                                                ].join(" ")}
                                                                                            >
                                                                                                {task.status === "done" ? <IconCheck c="h-2.5 w-2.5 text-white" /> : null}
                                                                                                {task.status === "in_progress" ? <div className="h-1.5 w-1.5 rounded-full bg-[#2f80ed]" /> : null}
                                                                                            </div>

                                                                                            <div className="min-w-0 flex-1">
                                                                                                <span
                                                                                                    className={[
                                                                                                        "text-[12.5px] font-medium leading-snug",
                                                                                                        task.status === "done" ? "text-[#9ab0c4] line-through" : "text-[#0b1623]",
                                                                                                    ].join(" ")}
                                                                                                >
                                                                                                    {task.title}
                                                                                                </span>
                                                                                                <p className="mt-0.5 text-[11px] leading-[1.45] text-[#7a90a8]">{task.note}</p>
                                                                                                {task.due_date ? (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => openCalendarForTask(task)}
                                                                                                        className="mt-1 inline-flex rounded-full border border-[#8a65cc]/[0.22] bg-[#8a65cc]/[0.08] px-2 py-0.5 text-[9.5px] font-semibold text-[#5e38a0] transition hover:bg-[#8a65cc]/[0.14]"
                                                                                                    >
                                                                                                        Scheduled: {formatDisplayDate(task.due_date)}
                                                                                                    </button>
                                                                                                ) : null}
                                                                                            </div>

                                                                                            <div className="flex shrink-0 items-center gap-1.5">
                                                                                                <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em]", taskBadge(task.status)].join(" ")}>
                                                                                                    {getTaskLabel(task.status)}
                                                                                                </span>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => setEditingTaskId(task.id)}
                                                                                                    className="rounded-[7px] border border-[#ccd9e8] bg-white/[0.70] px-2.5 py-1 text-[11px] text-[#4e6880] transition hover:border-[#2f80ed]/[0.38] hover:text-[#2060cc] active:scale-[0.97]"
                                                                                                >
                                                                                                    Edit
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => startSchedule(task)}
                                                                                                    className="rounded-[7px] border border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.08] px-2.5 py-1 text-[11px] text-[#5e38a0] transition hover:bg-[#8a65cc]/[0.14] active:scale-[0.97]"
                                                                                                >
                                                                                                    {task.calendar_item_id ? "Reschedule" : "Schedule"}
                                                                                                </button>
                                                                                                {task.calendar_item_id ? (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => openCalendarForTask(task)}
                                                                                                        className="rounded-[7px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1 text-[11px] text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14] active:scale-[0.97]"
                                                                                                    >
                                                                                                        Calendar
                                                                                                    </button>
                                                                                                ) : null}
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => removeTask(stage.id, task.id)}
                                                                                                    className="rounded-[7px] border border-[#e2c4bb] bg-[#c78973]/[0.07] px-2.5 py-1 text-[11px] text-[#8c5947] transition hover:bg-[#c78973]/[0.15] active:scale-[0.97]"
                                                                                                >
                                                                                                    ×
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {schedulingTaskId === task.id ? (
                                                                                        <div className="mt-3 rounded-[12px] border border-[#8a65cc]/[0.20] bg-[#8a65cc]/[0.06] p-3">
                                                                                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#5e38a0]">Schedule in Calendar</div>
                                                                                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
                                                                                                <label className="block text-[11px] font-semibold text-[#607993]">
                                                                                                    Date
                                                                                                    <div className="mt-1">
                                                                                                        <AdminDatePicker value={scheduleDate} onChange={setScheduleDate} />
                                                                                                    </div>
                                                                                                </label>
                                                                                                <label className="block text-[11px] font-semibold text-[#607993]">
                                                                                                    Time
                                                                                                    <input
                                                                                                        type="time"
                                                                                                        value={scheduleTime}
                                                                                                        onChange={(event) => setScheduleTime(event.target.value)}
                                                                                                        className="mt-1 w-full rounded-[9px] border border-[#ccd9e8] bg-white/[0.88] px-3 py-2 text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                                                                                    />
                                                                                                </label>
                                                                                                <div className="flex gap-2">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => void saveSchedule(task)}
                                                                                                        disabled={saving}
                                                                                                        className="rounded-[9px] bg-[#8a65cc] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#7651b8] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
                                                                                                    >
                                                                                                        Save
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setSchedulingTaskId(null)}
                                                                                                        className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.62] px-3 py-2 text-[11px] font-semibold text-[#607993] transition hover:bg-white/[0.86] active:scale-[0.97]"
                                                                                                    >
                                                                                                        Cancel
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ) : null}

                                                            <div className="rounded-[12px] border border-[#d8e8f6]/80 bg-[#f4f8fd]/80 px-4 py-3 text-[12px] leading-[1.6] text-[#3a5272]">
                                                                <span className="font-semibold text-[#2060cc]">Epitropos lesson: </span>
                                                                {stage.lesson}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                                                    <span className={["rounded-full border px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]", stageBadge(stage.status)].join(" ")}>
                                                        {getStageLabel(stage.status)}
                                                    </span>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setEditingStageId(stage.id);
                                                                selectStage(stage.id);
                                                            }}
                                                            className="rounded-[8px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14] active:scale-[0.97]"
                                                        >
                                                            Edit
                                                        </button>

                                                        {stage.tasks.length === 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void removeStage(stage);
                                                                }}
                                                                className="rounded-[8px] border border-[#e2c4bb] bg-[#c78973]/[0.07] px-2.5 py-1.5 text-[11px] font-medium text-[#8c5947] transition hover:bg-[#c78973]/[0.15] active:scale-[0.97]"
                                                            >
                                                                Delete
                                                            </button>
                                                        ) : null}

                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void addTask(stage.id);
                                                            }}
                                                            className="flex items-center gap-1 rounded-[8px] border border-[#ccd9e8] bg-white/[0.60] px-2.5 py-1.5 text-[11px] font-medium text-[#4e6880] transition hover:border-[#2f80ed]/[0.32] hover:bg-white/[0.85] hover:text-[#2060cc] active:scale-[0.97]"
                                                        >
                                                            <IconPlus />
                                                            Task
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                toggleExpanded(stage.id);
                                                            }}
                                                            aria-label={expanded ? "Collapse stage" : "Expand stage"}
                                                            className={[
                                                                "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200",
                                                                expanded
                                                                    ? "border-[#2f80ed]/30 bg-[#2f80ed]/10 text-[#2060cc]"
                                                                    : "border-[#ccd9e8] bg-white/[0.60] text-[#7a90a8] hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.85]",
                                                            ].join(" ")}
                                                        >
                                                            <IconChevron c={["h-3.5 w-3.5 transition-transform duration-200", expanded ? "rotate-180" : ""].join(" ")} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="relative overflow-hidden rounded-[26px] border border-white/[0.80] bg-white/[0.58] shadow-[0_20px_70px_rgba(41,73,112,0.09),inset_0_1px_0_rgba(255,255,255,0.97)] backdrop-blur-2xl">
                        <div
                            className="pointer-events-none absolute inset-0 bg-[length:100%_auto] bg-center bg-no-repeat opacity-[0.51] saturate-[1.68] contrast-[1.58]"
                            style={{ backgroundImage: `url('${FOOTER_IMAGE}')` }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.76] via-white/[0.78] to-white/[0.46]" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.52] via-transparent to-white/[0.66]" />
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-[62%] bg-white/[0.36] backdrop-blur-[2px]" />

                        <div className="relative grid gap-5 p-6 xl:grid-cols-[1fr_1fr_1fr_320px] xl:gap-0">
                            <div className="col-span-full mb-1 flex items-center gap-2 xl:hidden">
                                <IconBulb c="h-4 w-4 text-[#2060cc]" />
                                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Notes & Tips</span>
                            </div>

                            <div className="xl:border-r xl:border-[#d8e8f6]/70 xl:pr-5">
                                <div className="mb-1 hidden items-center gap-2 xl:flex">
                                    <IconBulb c="h-4 w-4 text-[#2060cc]" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Notes & Tips</span>
                                </div>
                                <div className="mb-1 text-[12.5px] font-semibold text-[#0b1623]">Keep your documents organized</div>
                                <p className="text-[12px] leading-[1.6] text-[#7a90a8]">{unit19FocusNotes[0]}</p>
                            </div>

                            <div className="xl:border-r xl:border-[#d8e8f6]/70 xl:px-5">
                                <div className="mb-1 text-[12.5px] font-semibold text-[#0b1623]">Track everything in real time</div>
                                <p className="text-[12px] leading-[1.6] text-[#7a90a8]">{unit19FocusNotes[1]}</p>
                            </div>

                            <div className="xl:border-r xl:border-[#d8e8f6]/70 xl:px-5">
                                <div className="mb-1 text-[12.5px] font-semibold text-[#0b1623]">Stay ahead of risks</div>
                                <p className="text-[12px] leading-[1.6] text-[#7a90a8]">{unit19FocusNotes[2]}</p>
                            </div>

                            <div className="xl:pl-5">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#2060cc]" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">AI Workspace</span>
                                </div>
                                <p className="mb-3 text-[12px] leading-[1.6] text-[#4e6880]">
                                    Use the project chat as the working layer for decisions, summaries and next-step planning.
                                </p>
                                <div className="space-y-2">
                                    <a
                                        href="https://chat.openai.com/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-[11px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3.5 py-2.5 text-[12px] font-semibold text-[#1560bc] transition hover:-translate-y-0.5 hover:bg-[#2f80ed]/[0.13] active:scale-[0.98]"
                                    >
                                        <span>Open ChatGPT</span>
                                        <IconExternal />
                                    </a>
                                    <button
                                        type="button"
                                        disabled
                                        className="flex w-full cursor-not-allowed items-center justify-between rounded-[11px] border border-[#ccd9e8] bg-white/[0.52] px-3.5 py-2.5 text-left text-[12px] text-[#9ab0c4]"
                                    >
                                        <span>Export roadmap context</span>
                                        <span className="rounded-full border border-[#ccd9e8] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#9ab0c4]">Soon</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled
                                        className="flex w-full cursor-not-allowed items-center justify-between rounded-[11px] border border-[#ccd9e8] bg-white/[0.52] px-3.5 py-2.5 text-left text-[12px] text-[#9ab0c4]"
                                    >
                                        <span>Epitropos AI Assistant</span>
                                        <span className="rounded-full border border-[#ccd9e8] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#9ab0c4]">Planned</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Unit19RealEstateModal
                        propertySlug={projectSlug}
                        projectLabel={projectLabel}
                        open={realEstateOpen}
                        onClose={() => setRealEstateOpen(false)}
                        onSwitchPanel={switchPanel}
                    />

                    <Unit19ExpensesModal
                        propertySlug={projectSlug}
                        projectLabel={projectLabel}
                        open={expensesOpen}
                        onClose={() => setExpensesOpen(false)}
                        onSwitchPanel={switchPanel}
                    />

                    <Unit19DocumentsModal
                        propertySlug={projectSlug}
                        projectLabel={projectLabel}
                        open={documentsOpen}
                        onClose={() => setDocumentsOpen(false)}
                        onSwitchPanel={switchPanel}
                    />

                    <Unit19IncomeModal
                        propertySlug={projectSlug}
                        projectLabel={projectLabel}
                        open={incomeOpen}
                        onClose={() => setIncomeOpen(false)}
                        onSwitchPanel={switchPanel}
                    />

                    <Unit19CalendarModal
                        propertySlug={projectSlug}
                        projectLabel={projectLabel}
                        open={calendarOpen}
                        onClose={() => setCalendarOpen(false)}
                        initialDate={calendarTargetDate}
                        initialItemId={calendarTargetItemId}
                        onInitialTargetConsumed={() => {
                            setCalendarTargetDate(null);
                            setCalendarTargetItemId(null);
                        }}
                        onCalendarDataChanged={() => {
                            void loadRoadmap();
                        }}
                        onSwitchPanel={switchPanel}
                    />
                </main>
            </div>
        </section>
    );
}
