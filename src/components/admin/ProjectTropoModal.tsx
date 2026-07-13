"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Unit19ModalSwitcher, {
    type Unit19PanelKey,
} from "@/components/admin/Unit19ModalSwitcher";
import {
    getTropoActionTypeLabel,
    validateTropoAction,
    type TropoProposedAction,
} from "@/lib/admin/tropoActionSchemas";

export type ProjectTropoSnapshot = {
    progressPercent: number;
    totalStages: number;
    currentStageTitle: string;
    doneTasks: number;
    activeTasks: number;
    totalTasks: number;
    overdueTasks: number;
    nextDueDate: string | null;
};

export type ProjectTropoResolverTask = {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
};

export type ProjectTropoResolverStage = {
    id: string;
    title: string;
    status: string;
    tasks: ProjectTropoResolverTask[];
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
    onActionExecuted?: () => void;
    propertySlug: string;
    projectLabel: string;
    showRealEstate?: boolean;
    snapshot: ProjectTropoSnapshot;
    resolverStages: ProjectTropoResolverStage[];
};

type TaskFilterMode = "active" | "all";

type TropoActionCardState = {
    id: string;
    action: TropoProposedAction;
    status: "proposed" | "editing" | "executing" | "executed" | "rejected" | "error";
    editText: string;
    error: string | null;
    resultMessage: string | null;
    selectedStageId: string;
    selectedTaskId: string;
    taskFilter: TaskFilterMode;
    linkTask: boolean;
};

type TropoMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    actions?: TropoActionCardState[];
};

type ProviderUsagePayload = {
    requestsLimit?: string | null;
    requestsRemaining?: string | null;
    requestsReset?: string | null;
    tokensLimit?: string | null;
    tokensRemaining?: string | null;
    tokensReset?: string | null;
    retryAfterSeconds?: number | null;
};

type ProviderUsageState = ProviderUsagePayload & {
    provider?: string;
    model?: string;
};

type ExecuteResponse = {
    result?: {
        message?: string;
    };
    error?: string;
};

type ChatResponse = {
    reply?: string;
    proposedActions?: TropoProposedAction[];
    provider?: string;
    model?: string;
    usage?: ProviderUsagePayload | null;
    retryAfterSeconds?: number | null;
    error?: string;
};

const QUICK_PROMPTS = [
    "До къде сме?",
    "Какво следва?",
    "Какво е просрочено?",
    "Кои са най-важните рискове?",
    "Как стоим с бюджета?",
    "Кои документи липсват?",
];

const ACTIVE_TASK_STATUSES = new Set(["open", "pending", "scheduled", "in_progress", "watch", "blocked"]);

function createMessageId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDisplayDate(value: string | null) {
    if (!value) return "No dated task";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}.${month}.${year}`;
}

function actionToEditText(action: TropoProposedAction) {
    return JSON.stringify(action, null, 2);
}

function findStageForTask(stages: ProjectTropoResolverStage[], taskId: string | null | undefined) {
    if (!taskId) return null;
    return stages.find((stage) => stage.tasks.some((task) => task.id === taskId)) ?? null;
}

function getDefaultStageId(stages: ProjectTropoResolverStage[]) {
    return (
        stages.find((stage) => stage.status === "current")?.id ??
        stages.find((stage) => stage.tasks.some((task) => task.status === "in_progress"))?.id ??
        stages[0]?.id ??
        ""
    );
}

function getActionStageId(action: TropoProposedAction) {
    if (action.type === "create_task" || action.type === "update_task") {
        return action.payload.stage_id ?? "";
    }

    return "";
}

function getActionTaskId(action: TropoProposedAction) {
    if (
        action.type === "update_task" ||
        action.type === "set_task_status" ||
        action.type === "schedule_task" ||
        action.type === "create_calendar_item" ||
        action.type === "update_calendar_item"
    ) {
        return action.payload.task_id ?? "";
    }

    return "";
}

function createActionCards(
    actions: TropoProposedAction[],
    stages: ProjectTropoResolverStage[],
): TropoActionCardState[] {
    return actions.map((action) => {
        const actionTaskId = getActionTaskId(action);
        const taskStage = findStageForTask(stages, actionTaskId);
        const explicitStageId = getActionStageId(action);
        const selectedStageId =
            action.type === "create_task" && !explicitStageId
                ? ""
                : explicitStageId || taskStage?.id || getDefaultStageId(stages);

        return {
            id: action.id,
            action,
            status: "proposed",
            editText: actionToEditText(action),
            error: null,
            resultMessage: null,
            selectedStageId,
            selectedTaskId: actionTaskId,
            taskFilter: "active",
            linkTask: Boolean(actionTaskId),
        };
    });
}

function summarizePayload(payload: TropoProposedAction["payload"]) {
    return Object.entries(payload)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({
            key,
            value: value === null || value === "" ? "—" : String(value),
        }));
}

function selectableTasks(
    stages: ProjectTropoResolverStage[],
    stageId: string,
    filter: TaskFilterMode,
) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) return [];

    if (filter === "all") return stage.tasks;
    return stage.tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status));
}

function normalizeAssistantText(value: string) {
    return value
        .replace(/\s+(\d{1,2})\.\s+/g, "\n$1. ")
        .replace(/\s+([-•])\s+/g, "\n$1 ")
        .replace(/\s+(Completed|Current|Next|Risks|Blocked|Documents|Budget|Следващо|Рискове|Текущо|Завършено|Документи|Бюджет):/gi, "\n$1:")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function renderAssistantContent(content: string) {
    const normalized = normalizeAssistantText(content);
    const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

    return (
        <div className="space-y-2 whitespace-normal">
            {lines.map((line, index) => {
                const numbered = line.match(/^(\d{1,2})\.\s+(.+)$/);
                if (numbered) {
                    return (
                        <div key={`${index}-${line}`} className="flex gap-2 rounded-[12px] border border-[#d8e2ef]/[0.72] bg-white/[0.46] px-2.5 py-2">
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6c8fd8]/[0.13] text-[9.5px] font-semibold text-[#315fa8]">
                                {numbered[1]}
                            </span>
                            <span className="min-w-0 flex-1 text-[12px] leading-[1.55] text-[#24384e]">{numbered[2]}</span>
                        </div>
                    );
                }

                const bullet = line.match(/^[-•]\s+(.+)$/);
                if (bullet) {
                    return (
                        <div key={`${index}-${line}`} className="flex gap-2 pl-1">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#8a65cc]" />
                            <span className="min-w-0 flex-1 text-[12px] leading-[1.6] text-[#24384e]">{bullet[1]}</span>
                        </div>
                    );
                }

                if (line.endsWith(":") && line.length <= 72) {
                    return (
                        <div key={`${index}-${line}`} className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c3ca7]">
                            {line}
                        </div>
                    );
                }

                return (
                    <p key={`${index}-${line}`} className="text-[12.5px] leading-[1.65] text-[#24384e]">
                        {line}
                    </p>
                );
            })}
        </div>
    );
}

function usageValue(value: string | null | undefined) {
    return value && value.trim() ? value : "not reported";
}

function applyUsagePayload(
    payload: ChatResponse,
    fallbackProvider?: string,
    fallbackModel?: string,
): ProviderUsageState | null {
    if (!payload.usage && !payload.retryAfterSeconds && !payload.provider && !payload.model) return null;

    return {
        provider: payload.provider ?? fallbackProvider,
        model: payload.model ?? fallbackModel,
        requestsLimit: payload.usage?.requestsLimit ?? null,
        requestsRemaining: payload.usage?.requestsRemaining ?? null,
        requestsReset: payload.usage?.requestsReset ?? null,
        tokensLimit: payload.usage?.tokensLimit ?? null,
        tokensRemaining: payload.usage?.tokensRemaining ?? null,
        tokensReset: payload.usage?.tokensReset ?? null,
        retryAfterSeconds: payload.retryAfterSeconds ?? payload.usage?.retryAfterSeconds ?? null,
    };
}

function IconClose() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function IconSpark() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3 1.4 4.3L18 9l-4.6 1.7L12 15l-1.4-4.3L6 9l4.6-1.7L12 3Z" />
            <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
            <path d="m5 2 .8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z" />
        </svg>
    );
}

function IconSend() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="m9 7 1-3h4l1 3" />
            <path d="m6 7 1 14h10l1-14" />
        </svg>
    );
}

function IconContext() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v14H4z" />
            <path d="M8 9h8M8 13h5" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m20 6-11 11-5-5" />
        </svg>
    );
}

function IconEdit() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    );
}

function welcomeMessage(projectLabel: string): TropoMessage {
    return {
        id: "welcome",
        role: "assistant",
        content: `Аз съм Tropo — личният асистент за ${projectLabel}. Чета живите структурирани данни на проекта и мога да обобщавам напредъка, сроковете, рисковете, документите, бюджета и следващите действия. Вече мога да подготвям безопасни действия за задачи и календар, но записвам само след изрично одобрение.`,
    };
}

export default function ProjectTropoModal({
    open,
    onClose,
    onSwitchPanel,
    onActionExecuted,
    propertySlug,
    projectLabel,
    showRealEstate = false,
    snapshot,
    resolverStages,
}: Props) {
    const [messages, setMessages] = useState<TropoMessage[]>(() => [welcomeMessage(projectLabel)]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usageStatus, setUsageStatus] = useState<ProviderUsageState | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const progressLabel = useMemo(
        () => `${snapshot.doneTasks} / ${snapshot.totalTasks} tasks`,
        [snapshot.doneTasks, snapshot.totalTasks],
    );

    useEffect(() => {
        setMessages([welcomeMessage(projectLabel)]);
        setDraft("");
        setError(null);
        setUsageStatus(null);
    }, [projectLabel, propertySlug]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.setTimeout(() => inputRef.current?.focus(), 80);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, open]);

    useEffect(() => {
        if (!open) return;
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [loading, messages, open]);

    function updateActionCard(
        messageId: string,
        actionId: string,
        patch: Partial<TropoActionCardState>,
    ) {
        setMessages((current) =>
            current.map((message) => {
                if (message.id !== messageId || !message.actions) return message;

                return {
                    ...message,
                    actions: message.actions.map((card) =>
                        card.id === actionId ? { ...card, ...patch } : card,
                    ),
                };
            }),
        );
    }

    async function sendMessage(contentOverride?: string) {
        const content = (contentOverride ?? draft).trim();
        if (!content || loading) return;

        const userMessage: TropoMessage = {
            id: createMessageId(),
            role: "user",
            content,
        };
        const nextMessages = [...messages, userMessage];

        setMessages(nextMessages);
        setDraft("");
        setError(null);
        setLoading(true);

        try {
            const response = await fetch("/api/admin/project-assistant/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectSlug: propertySlug,
                    messages: nextMessages.map(({ role, content: messageContent }) => ({
                        role,
                        content: messageContent,
                    })),
                }),
            });

            const payload = (await response.json()) as ChatResponse;
            const nextUsage = applyUsagePayload(payload, usageStatus?.provider, usageStatus?.model);
            if (nextUsage) setUsageStatus(nextUsage);

            if (!response.ok || !payload.reply) {
                throw new Error(payload.error || "Tropo did not return a response");
            }

            const assistantMessage: TropoMessage = {
                id: createMessageId(),
                role: "assistant",
                content: payload.reply,
                actions: createActionCards(payload.proposedActions ?? [], resolverStages),
            };

            setMessages((current) => [...current, assistantMessage]);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Failed to contact Tropo",
            );
        } finally {
            setLoading(false);
            window.setTimeout(() => inputRef.current?.focus(), 50);
        }
    }

    function parseCardAction(card: TropoActionCardState) {
        if (card.status !== "editing") return card.action;

        const parsed = JSON.parse(card.editText) as unknown;
        const validation = validateTropoAction(parsed, { allowUnresolved: true });

        if (!validation.ok) {
            throw new Error(validation.error);
        }

        return validation.action;
    }

    function resolveActionForExecution(card: TropoActionCardState) {
        const action = parseCardAction(card);

        if (action.type === "create_task") {
            const stageId = card.selectedStageId || action.payload.stage_id;
            if (!stageId) throw new Error("Избери етап, преди да одобриш задачата.");
            return { ...action, payload: { ...action.payload, stage_id: stageId } };
        }

        if (action.type === "update_task") {
            const taskId = card.selectedTaskId || action.payload.task_id;
            if (!taskId) throw new Error("Избери задача, преди да одобриш редакцията.");
            return { ...action, payload: { ...action.payload, task_id: taskId } };
        }

        if (action.type === "set_task_status") {
            const taskId = card.selectedTaskId || action.payload.task_id;
            if (!taskId) throw new Error("Избери задача, преди да одобриш статуса.");
            return { ...action, payload: { ...action.payload, task_id: taskId } };
        }

        if (action.type === "schedule_task") {
            const taskId = card.selectedTaskId || action.payload.task_id;
            if (!taskId) throw new Error("Избери задача, преди да я насрочиш.");
            return { ...action, payload: { ...action.payload, task_id: taskId } };
        }

        if (action.type === "create_calendar_item") {
            const taskId = card.linkTask ? card.selectedTaskId || action.payload.task_id : null;
            if (card.linkTask && !taskId) throw new Error("Избери задача или остави събитието като standalone calendar item.");
            return { ...action, payload: { ...action.payload, task_id: taskId } };
        }

        return action;
    }

    async function approveAction(messageId: string, card: TropoActionCardState) {
        let actionToExecute: TropoProposedAction;

        try {
            const resolvedAction = resolveActionForExecution(card);
            const validation = validateTropoAction(resolvedAction);

            if (!validation.ok) {
                updateActionCard(messageId, card.id, { error: validation.error });
                return;
            }

            actionToExecute = validation.action;
        } catch (parseError) {
            updateActionCard(messageId, card.id, {
                error: parseError instanceof Error ? parseError.message : "Invalid action setup",
            });
            return;
        }

        updateActionCard(messageId, card.id, {
            action: actionToExecute,
            editText: actionToEditText(actionToExecute),
            status: "executing",
            error: null,
            resultMessage: null,
        });

        try {
            const response = await fetch("/api/admin/project-assistant/execute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectSlug: propertySlug,
                    action: actionToExecute,
                }),
            });

            const payload = (await response.json()) as ExecuteResponse;

            if (!response.ok || !payload.result) {
                throw new Error(payload.error || "Failed to execute Tropo action");
            }

            updateActionCard(messageId, card.id, {
                status: "executed",
                error: null,
                resultMessage: payload.result.message ?? "Action executed",
            });
            onActionExecuted?.();
        } catch (executeError) {
            updateActionCard(messageId, card.id, {
                status: "error",
                error: executeError instanceof Error ? executeError.message : "Failed to execute action",
            });
        } finally {
            window.setTimeout(() => inputRef.current?.focus(), 50);
        }
    }

    function rejectAction(messageId: string, card: TropoActionCardState) {
        updateActionCard(messageId, card.id, {
            status: "rejected",
            error: null,
            resultMessage: "Rejected",
        });
    }

    function startEditAction(messageId: string, card: TropoActionCardState) {
        updateActionCard(messageId, card.id, {
            status: "editing",
            editText: actionToEditText(card.action),
            error: null,
        });
    }

    function cancelEditAction(messageId: string, card: TropoActionCardState) {
        updateActionCard(messageId, card.id, {
            status: "proposed",
            editText: actionToEditText(card.action),
            error: null,
        });
    }

    function changeActionEditText(messageId: string, actionId: string, editText: string) {
        updateActionCard(messageId, actionId, { editText, error: null });
    }

    function changeActionStage(messageId: string, card: TropoActionCardState, stageId: string) {
        const nextTasks = selectableTasks(resolverStages, stageId, card.taskFilter);
        const taskStillAvailable = nextTasks.some((task) => task.id === card.selectedTaskId);
        updateActionCard(messageId, card.id, {
            selectedStageId: stageId,
            selectedTaskId: taskStillAvailable ? card.selectedTaskId : "",
            error: null,
        });
    }

    function clearConversation() {
        setMessages([welcomeMessage(projectLabel)]);
        setDraft("");
        setError(null);
        window.setTimeout(() => inputRef.current?.focus(), 50);
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] overflow-hidden px-3 py-3 sm:px-5">
            <button
                type="button"
                aria-label="Close Tropo modal"
                className="fixed inset-0 cursor-default bg-[#06101d]/[0.56] backdrop-blur-[12px]"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-white/[0.72] bg-white/[0.74] shadow-[0_30px_120px_rgba(6,16,29,0.42),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(190,116,255,0.17),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(64,155,255,0.16),transparent_24%),radial-gradient(circle_at_64%_88%,rgba(230,174,86,0.13),transparent_28%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.66] to-transparent" />

                <div className="relative shrink-0 border-b border-white/[0.72] px-5 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#9c63d8]/[0.26] bg-[#9c63d8]/[0.09] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#6c3ca7]">
                                <IconSpark />
                                Tropo · Project assistant · DB live
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                {projectLabel} Assistant
                            </h2>
                            <p className="mt-0.5 text-[11px] text-[#6f849d]">
                                Live project context · proposed actions · approval before write
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Unit19ModalSwitcher
                                activePanel="tropo"
                                onSwitchPanel={onSwitchPanel}
                                incomeLabel="Budget"
                                showRealEstate={showRealEstate}
                            />
                            <button
                                type="button"
                                onClick={clearConversation}
                                disabled={loading || messages.length <= 1}
                                className="inline-flex items-center gap-1.5 rounded-[13px] border border-[#ccd9e8] bg-white/[0.56] px-3 py-2 text-[11px] font-semibold text-[#607993] transition hover:-translate-y-0.5 hover:border-[#9c63d8]/[0.28] hover:bg-white/[0.88] hover:text-[#6c3ca7] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <IconTrash />
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.78] bg-white/[0.62] text-[#6f849d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:border-[#9c63d8]/[0.28] hover:bg-white/[0.86] hover:text-[#6c3ca7] active:scale-[0.96]"
                            >
                                <IconClose />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[290px_minmax(0,1fr)]">
                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.38] p-3.5 lg:border-b-0 lg:border-r">
                        <div className="rounded-[17px] border border-white/[0.80] bg-white/[0.60] p-3.5 shadow-[0_12px_30px_rgba(41,73,112,0.07),inset_0_1px_0_rgba(255,255,255,0.94)]">
                            <div className="mb-3 flex items-center gap-2 text-[#6c3ca7]">
                                <IconContext />
                                <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em]">Live project pulse</div>
                            </div>

                            <div className="space-y-2.5">
                                <div className="rounded-[13px] border border-[#9c63d8]/[0.15] bg-[#9c63d8]/[0.06] p-3">
                                    <div className="flex items-end justify-between gap-2">
                                        <div>
                                            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8a90a8]">Progress</div>
                                            <div className="mt-1 text-[22px] font-semibold text-[#0b1623]">{snapshot.progressPercent}%</div>
                                        </div>
                                        <div className="text-right text-[10px] font-medium text-[#6f849d]">{progressLabel}</div>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.72]">
                                        <div className="h-full rounded-full bg-gradient-to-r from-[#8a65cc] to-[#5d8fe8]" style={{ width: `${snapshot.progressPercent}%` }} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-[12px] border border-white/[0.76] bg-white/[0.52] p-2.5">
                                        <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#8a90a8]">Active</div>
                                        <div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{snapshot.activeTasks}</div>
                                    </div>
                                    <div className="rounded-[12px] border border-white/[0.76] bg-white/[0.52] p-2.5">
                                        <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#8a90a8]">Overdue</div>
                                        <div className="mt-1 text-[18px] font-semibold text-[#b75050]">{snapshot.overdueTasks}</div>
                                    </div>
                                </div>

                                <div className="rounded-[12px] border border-white/[0.76] bg-white/[0.52] p-2.5">
                                    <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#8a90a8]">Current stage</div>
                                    <div className="mt-1 text-[12px] font-semibold text-[#0b1623]">{snapshot.currentStageTitle}</div>
                                </div>

                                <div className="rounded-[12px] border border-white/[0.76] bg-white/[0.52] p-2.5">
                                    <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#8a90a8]">Next dated task</div>
                                    <div className="mt-1 text-[12px] font-semibold text-[#0b1623]">{formatDisplayDate(snapshot.nextDueDate)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[17px] border border-white/[0.80] bg-white/[0.60] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#6c3ca7]">Quick asks</div>
                            <div className="space-y-1.5">
                                {QUICK_PROMPTS.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        onClick={() => void sendMessage(prompt)}
                                        disabled={loading}
                                        className="w-full rounded-[11px] border border-transparent bg-white/[0.34] px-3 py-2 text-left text-[11px] font-medium text-[#4e6880] transition hover:-translate-y-0.5 hover:border-[#9c63d8]/[0.20] hover:bg-white/[0.76] hover:text-[#0b1623] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[17px] border border-white/[0.80] bg-white/[0.54] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#6c3ca7]">Provider limits</div>
                            {usageStatus ? (
                                <div className="space-y-1.5 text-[10.5px] leading-[1.45] text-[#607993]">
                                    <div className="flex justify-between gap-2"><span>Provider</span><span className="font-semibold text-[#24384e]">{usageStatus.provider ?? "—"}</span></div>
                                    <div className="flex justify-between gap-2"><span>Tokens</span><span className="font-semibold text-[#24384e]">{usageValue(usageStatus.tokensRemaining)} / {usageValue(usageStatus.tokensLimit)}</span></div>
                                    <div className="flex justify-between gap-2"><span>Requests</span><span className="font-semibold text-[#24384e]">{usageValue(usageStatus.requestsRemaining)} / {usageValue(usageStatus.requestsLimit)}</span></div>
                                    {usageStatus.retryAfterSeconds ? (
                                        <div className="rounded-[10px] border border-[#d8b95f]/[0.24] bg-[#d8b95f]/[0.09] px-2 py-1.5 text-[#725b16]">
                                            Wait about {Math.ceil(usageStatus.retryAfterSeconds)}s before retrying.
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="text-[10.5px] leading-[1.45] text-[#7b8fa3]">
                                    Exact remaining tokens appear here when the provider returns rate-limit headers.
                                </div>
                            )}
                        </div>

                        <div className="mt-2.5 rounded-[15px] border border-[#d8b95f]/[0.26] bg-[#d8b95f]/[0.08] px-3 py-2.5 text-[10.5px] leading-[1.5] text-[#725b16]">
                            Safe writes are limited to Roadmap tasks and Calendar items. Delete, budget, document, expense and property writes are still locked.
                        </div>
                    </aside>

                    <section className="flex min-h-0 flex-col bg-white/[0.20]">
                        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
                            <div className="mx-auto max-w-[980px] space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={[
                                            "flex",
                                            message.role === "user" ? "justify-end" : "justify-start",
                                        ].join(" ")}
                                    >
                                        <div
                                            className={[
                                                "max-w-[92%] rounded-[18px] border px-4 py-3 shadow-[0_12px_34px_rgba(41,73,112,0.07)] sm:max-w-[82%]",
                                                message.role === "user"
                                                    ? "border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.10] text-[#183e70] whitespace-pre-wrap text-[12.5px] leading-[1.65]"
                                                    : "border-white/[0.84] bg-white/[0.72] text-[#24384e]",
                                            ].join(" ")}
                                        >
                                            {message.role === "assistant" ? (
                                                <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6c3ca7]">
                                                    <IconSpark />
                                                    Tropo
                                                </div>
                                            ) : null}
                                            {message.role === "assistant" ? renderAssistantContent(message.content) : message.content}

                                            {message.actions && message.actions.length > 0 ? (
                                                <div className="mt-4 space-y-3 whitespace-normal">
                                                    {message.actions.map((card) => {
                                                        const payloadSummary = summarizePayload(card.action.payload);
                                                        const locked = card.status === "executing" || card.status === "executed" || card.status === "rejected";
                                                        const taskOptions = selectableTasks(resolverStages, card.selectedStageId, card.taskFilter);
                                                        const showStageResolver = card.action.type === "create_task" || card.action.type === "update_task";
                                                        const showTaskResolver =
                                                            card.action.type === "update_task" ||
                                                            card.action.type === "set_task_status" ||
                                                            card.action.type === "schedule_task" ||
                                                            (card.action.type === "create_calendar_item" && card.linkTask);

                                                        return (
                                                            <div
                                                                key={card.id}
                                                                className="rounded-[16px] border border-[#9c63d8]/[0.22] bg-[#f8f4ff]/[0.82] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                                                            >
                                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                                    <div>
                                                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#9c63d8]/[0.22] bg-white/[0.55] px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#6c3ca7]">
                                                                            Proposed action · {getTropoActionTypeLabel(card.action.type)}
                                                                        </div>
                                                                        <div className="mt-2 text-[13px] font-semibold text-[#17263a]">{card.action.label}</div>
                                                                        {card.action.reason ? (
                                                                            <div className="mt-1 text-[10.5px] leading-[1.45] text-[#6f849d]">{card.action.reason}</div>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className={[
                                                                        "rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.10em]",
                                                                        card.status === "executed"
                                                                            ? "bg-[#1f9d64]/[0.12] text-[#157247]"
                                                                            : card.status === "rejected"
                                                                                ? "bg-[#8ca0b4]/[0.14] text-[#64798f]"
                                                                                : card.status === "error"
                                                                                    ? "bg-[#d96969]/[0.12] text-[#9d2f2f]"
                                                                                    : "bg-[#2f80ed]/[0.10] text-[#2060cc]",
                                                                    ].join(" ")}>{card.status}</div>
                                                                </div>

                                                                {card.action.type === "create_calendar_item" ? (
                                                                    <div className="mt-3 rounded-[13px] border border-white/[0.74] bg-white/[0.48] p-2.5">
                                                                        <div className="mb-2 text-[8.5px] font-semibold uppercase tracking-[0.10em] text-[#8ca0b4]">Calendar link</div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <button
                                                                                type="button"
                                                                                disabled={locked}
                                                                                onClick={() => updateActionCard(message.id, card.id, { linkTask: false, selectedTaskId: "", error: null })}
                                                                                className={[
                                                                                    "rounded-[11px] border px-3 py-1.5 text-[10.5px] font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
                                                                                    !card.linkTask ? "border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.10] text-[#2060cc]" : "border-[#d8e2ef] bg-white/[0.56] text-[#607993]",
                                                                                ].join(" ")}
                                                                            >
                                                                                Standalone calendar item
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={locked}
                                                                                onClick={() => updateActionCard(message.id, card.id, { linkTask: true, error: null })}
                                                                                className={[
                                                                                    "rounded-[11px] border px-3 py-1.5 text-[10.5px] font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
                                                                                    card.linkTask ? "border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.10] text-[#2060cc]" : "border-[#d8e2ef] bg-white/[0.56] text-[#607993]",
                                                                                ].join(" ")}
                                                                            >
                                                                                Link to task
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : null}

                                                                {(showStageResolver || showTaskResolver) && resolverStages.length > 0 ? (
                                                                    <div className="mt-3 rounded-[13px] border border-[#d8e2ef]/[0.78] bg-white/[0.56] p-2.5">
                                                                        <div className="mb-2 text-[8.5px] font-semibold uppercase tracking-[0.10em] text-[#8ca0b4]">Resolve by title, not database ID</div>
                                                                        <div className="grid gap-2 md:grid-cols-2">
                                                                            <label className="block">
                                                                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.10em] text-[#8ca0b4]">Stage</span>
                                                                                <select
                                                                                    value={card.selectedStageId}
                                                                                    disabled={locked}
                                                                                    onChange={(event) => changeActionStage(message.id, card, event.target.value)}
                                                                                    className="w-full rounded-[11px] border border-[#d8e2ef] bg-white/[0.82] px-2.5 py-2 text-[11px] font-medium text-[#24384e] outline-none focus:border-[#9c63d8]/[0.42]"
                                                                                >
                                                                                    <option value="">Select stage…</option>
                                                                                    {resolverStages.map((stage) => (
                                                                                        <option key={stage.id} value={stage.id}>{stage.title}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </label>

                                                                            {showTaskResolver ? (
                                                                                <label className="block">
                                                                                    <span className="mb-1 flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-[#8ca0b4]">
                                                                                        <span>Task</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={locked}
                                                                                            onClick={() => updateActionCard(message.id, card.id, { taskFilter: card.taskFilter === "active" ? "all" : "active", selectedTaskId: "", error: null })}
                                                                                            className="rounded-full border border-[#d8e2ef] bg-white/[0.58] px-2 py-0.5 text-[8.5px] normal-case tracking-normal text-[#607993] disabled:cursor-not-allowed disabled:opacity-45"
                                                                                        >
                                                                                            {card.taskFilter === "active" ? "Active only" : "All tasks"}
                                                                                        </button>
                                                                                    </span>
                                                                                    <select
                                                                                        value={card.selectedTaskId}
                                                                                        disabled={locked || !card.selectedStageId}
                                                                                        onChange={(event) => updateActionCard(message.id, card.id, { selectedTaskId: event.target.value, error: null })}
                                                                                        className="w-full rounded-[11px] border border-[#d8e2ef] bg-white/[0.82] px-2.5 py-2 text-[11px] font-medium text-[#24384e] outline-none focus:border-[#9c63d8]/[0.42] disabled:opacity-50"
                                                                                    >
                                                                                        <option value="">Select task…</option>
                                                                                        {taskOptions.map((task) => (
                                                                                            <option key={task.id} value={task.id}>
                                                                                                {task.title} · {task.status}{task.dueDate ? ` · ${formatDisplayDate(task.dueDate)}` : ""}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                </label>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                ) : null}

                                                                {card.status === "editing" ? (
                                                                    <textarea
                                                                        value={card.editText}
                                                                        onChange={(event) => changeActionEditText(message.id, card.id, event.target.value)}
                                                                        rows={10}
                                                                        className="mt-3 w-full resize-y rounded-[13px] border border-[#d8e2ef] bg-white/[0.82] px-3 py-2 font-mono text-[11px] leading-[1.55] text-[#17263a] outline-none transition focus:border-[#9c63d8]/[0.42] focus:ring-2 focus:ring-[#9c63d8]/[0.12]"
                                                                    />
                                                                ) : (
                                                                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                                                        {payloadSummary.map(({ key, value }) => (
                                                                            <div key={key} className="rounded-[10px] border border-white/[0.74] bg-white/[0.56] px-2.5 py-1.5">
                                                                                <div className="text-[8.5px] font-semibold uppercase tracking-[0.10em] text-[#8ca0b4]">{key}</div>
                                                                                <div className="mt-0.5 break-words text-[10.5px] font-medium text-[#24384e]">{value}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {card.error ? (
                                                                    <div className="mt-2 rounded-[11px] border border-[#d96969]/[0.24] bg-[#d96969]/[0.08] px-3 py-2 text-[10.5px] font-medium text-[#9d2f2f]">
                                                                        {card.error}
                                                                    </div>
                                                                ) : null}

                                                                {card.resultMessage ? (
                                                                    <div className="mt-2 rounded-[11px] border border-[#1f9d64]/[0.20] bg-[#1f9d64]/[0.08] px-3 py-2 text-[10.5px] font-medium text-[#157247]">
                                                                        {card.resultMessage}
                                                                    </div>
                                                                ) : null}

                                                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                                    {card.status === "editing" ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => cancelEditAction(message.id, card)}
                                                                                className="rounded-[11px] border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[10.5px] font-semibold text-[#607993] transition hover:-translate-y-0.5 hover:bg-white/[0.90] active:scale-[0.97]"
                                                                            >
                                                                                Cancel edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void approveAction(message.id, card)}
                                                                                className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#1f9d64]/[0.22] bg-[#1f9d64] px-3 py-1.5 text-[10.5px] font-semibold text-white shadow-[0_10px_22px_rgba(31,157,100,0.18)] transition hover:-translate-y-0.5 active:scale-[0.97]"
                                                                            >
                                                                                <IconCheck />
                                                                                Approve edited
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => rejectAction(message.id, card)}
                                                                                disabled={locked}
                                                                                className="rounded-[11px] border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[10.5px] font-semibold text-[#607993] transition hover:-translate-y-0.5 hover:bg-white/[0.90] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => startEditAction(message.id, card)}
                                                                                disabled={locked}
                                                                                className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#9c63d8]/[0.22] bg-white/[0.58] px-3 py-1.5 text-[10.5px] font-semibold text-[#6c3ca7] transition hover:-translate-y-0.5 hover:bg-white/[0.90] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                                                                            >
                                                                                <IconEdit />
                                                                                Edit JSON
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void approveAction(message.id, card)}
                                                                                disabled={locked}
                                                                                className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#1f9d64]/[0.22] bg-[#1f9d64] px-3 py-1.5 text-[10.5px] font-semibold text-white shadow-[0_10px_22px_rgba(31,157,100,0.18)] transition hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                                                                            >
                                                                                <IconCheck />
                                                                                Approve
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}

                                {loading ? (
                                    <div className="flex justify-start">
                                        <div className="rounded-[18px] border border-white/[0.84] bg-white/[0.72] px-4 py-3 shadow-[0_12px_34px_rgba(41,73,112,0.07)]">
                                            <div className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6c3ca7]">
                                                <IconSpark />
                                                Tropo is analysing the live project
                                            </div>
                                            <div className="flex gap-1.5">
                                                {[0, 1, 2].map((index) => (
                                                    <span
                                                        key={index}
                                                        className="h-1.5 w-1.5 rounded-full bg-[#8a65cc]"
                                                        style={{ animation: `tropo-pulse 1s ${index * 0.15}s ease-in-out infinite` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-white/[0.72] bg-white/[0.46] px-4 py-3 sm:px-6 lg:px-8">
                            <div className="mx-auto max-w-[980px]">
                                {error ? (
                                    <div className="mb-2.5 rounded-[13px] border border-[#d96969]/[0.24] bg-[#d96969]/[0.08] px-3 py-2 text-[11px] font-medium text-[#9d2f2f]">
                                        {error}
                                    </div>
                                ) : null}

                                <div className="flex items-end gap-2 rounded-[18px] border border-white/[0.86] bg-white/[0.72] p-2 shadow-[0_16px_44px_rgba(41,73,112,0.10),inset_0_1px_0_rgba(255,255,255,0.96)]">
                                    <textarea
                                        ref={inputRef}
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();
                                                void sendMessage();
                                            }
                                        }}
                                        rows={2}
                                        maxLength={6000}
                                        placeholder="Попитай Tropo за текущия проект…"
                                        className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] leading-[1.5] text-[#0b1623] outline-none placeholder:text-[#9ab0c4]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void sendMessage()}
                                        disabled={loading || !draft.trim()}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#8a65cc]/[0.30] bg-gradient-to-br from-[#8a65cc] to-[#5d8fe8] text-white shadow-[0_12px_28px_rgba(105,99,202,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(105,99,202,0.34)] active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <IconSend />
                                    </button>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[9.5px] text-[#8ca0b4]">
                                    <span>Enter to send · Shift+Enter for new line</span>
                                    <span>Approve before write</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <style jsx>{`
                    @keyframes tropo-pulse {
                        0%, 100% { opacity: 0.35; transform: translateY(0); }
                        50% { opacity: 1; transform: translateY(-3px); }
                    }
                `}</style>
            </div>
        </div>
    );
}
