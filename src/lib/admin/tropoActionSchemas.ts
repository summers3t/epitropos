export type TropoRoadmapTaskStatus =
    | "done"
    | "pending"
    | "scheduled"
    | "open"
    | "deferred"
    | "in_progress"
    | "watch"
    | "blocked";

export type TropoRoadmapTaskPriority = "critical" | "high" | "normal" | "low";

export type TropoCalendarItemType =
    | "task"
    | "deadline"
    | "appointment"
    | "payment"
    | "document_followup"
    | "reminder";

export type TropoCalendarItemStatus = "open" | "done" | "deferred";
export type TropoCalendarItemPriority = "critical" | "high" | "normal" | "low";

export type TropoActionType =
    | "create_task"
    | "update_task"
    | "set_task_status"
    | "schedule_task"
    | "create_calendar_item"
    | "update_calendar_item";

export type TropoCreateTaskPayload = {
    stage_id: string;
    title: string;
    note?: string | null;
    status?: TropoRoadmapTaskStatus;
    priority?: TropoRoadmapTaskPriority;
    due_date?: string | null;
};

export type TropoUpdateTaskPayload = {
    task_id: string;
    stage_id?: string | null;
    title?: string;
    note?: string | null;
    status?: TropoRoadmapTaskStatus;
    priority?: TropoRoadmapTaskPriority;
    due_date?: string | null;
};

export type TropoSetTaskStatusPayload = {
    task_id: string;
    status: "done" | "open";
};

export type TropoScheduleTaskPayload = {
    task_id: string;
    item_date: string;
    item_time?: string | null;
};

export type TropoCreateCalendarItemPayload = {
    title: string;
    item_date: string;
    item_time?: string | null;
    type?: TropoCalendarItemType;
    priority?: TropoCalendarItemPriority;
    status?: TropoCalendarItemStatus;
    location?: string | null;
    note?: string | null;
    task_id?: string | null;
};

export type TropoUpdateCalendarItemPayload = {
    calendar_item_id: string;
    task_id?: string | null;
    title?: string;
    item_date?: string;
    item_time?: string | null;
    type?: TropoCalendarItemType;
    priority?: TropoCalendarItemPriority;
    status?: TropoCalendarItemStatus;
    location?: string | null;
    note?: string | null;
};

type TropoActionBase = {
    id: string;
    label: string;
    reason: string | null;
};

export type TropoProposedAction =
    | (TropoActionBase & { type: "create_task"; payload: TropoCreateTaskPayload })
    | (TropoActionBase & { type: "update_task"; payload: TropoUpdateTaskPayload })
    | (TropoActionBase & { type: "set_task_status"; payload: TropoSetTaskStatusPayload })
    | (TropoActionBase & { type: "schedule_task"; payload: TropoScheduleTaskPayload })
    | (TropoActionBase & { type: "create_calendar_item"; payload: TropoCreateCalendarItemPayload })
    | (TropoActionBase & { type: "update_calendar_item"; payload: TropoUpdateCalendarItemPayload });

export type TropoAssistantTurn = {
    reply: string;
    proposed_actions: TropoProposedAction[];
};

type ValidationResult =
    | { ok: true; action: TropoProposedAction }
    | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const TROPO_TASK_STATUSES: TropoRoadmapTaskStatus[] = [
    "done",
    "pending",
    "scheduled",
    "open",
    "deferred",
    "in_progress",
    "watch",
    "blocked",
];

export const TROPO_TASK_PRIORITIES: TropoRoadmapTaskPriority[] = [
    "critical",
    "high",
    "normal",
    "low",
];

export const TROPO_CALENDAR_TYPES: TropoCalendarItemType[] = [
    "task",
    "deadline",
    "appointment",
    "payment",
    "document_followup",
    "reminder",
];

export const TROPO_CALENDAR_STATUSES: TropoCalendarItemStatus[] = ["open", "done", "deferred"];
export const TROPO_CALENDAR_PRIORITIES: TropoCalendarItemPriority[] = [
    "critical",
    "high",
    "normal",
    "low",
];

export const TROPO_ASSISTANT_TURN_JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["reply", "proposed_actions"],
    properties: {
        reply: {
            type: "string",
            description: "Concise user-facing answer in the same language as the user.",
        },
        proposed_actions: {
            type: "array",
            maxItems: 3,
            description: "Reviewable actions only when the user asks to create/edit/schedule task or calendar data.",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["type", "label", "reason", "payload"],
                properties: {
                    type: {
                        type: "string",
                        enum: [
                            "create_task",
                            "update_task",
                            "set_task_status",
                            "schedule_task",
                            "create_calendar_item",
                            "update_calendar_item",
                        ],
                    },
                    label: { type: "string", maxLength: 120 },
                    reason: { type: ["string", "null"], maxLength: 260 },
                    payload: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            stage_id: { type: ["string", "null"] },
                            task_id: { type: ["string", "null"] },
                            calendar_item_id: { type: ["string", "null"] },
                            title: { type: ["string", "null"], maxLength: 180 },
                            note: { type: ["string", "null"], maxLength: 1200 },
                            status: {
                                type: ["string", "null"],
                                enum: [
                                    "done",
                                    "pending",
                                    "scheduled",
                                    "open",
                                    "deferred",
                                    "in_progress",
                                    "watch",
                                    "blocked",
                                    null,
                                ],
                            },
                            priority: {
                                type: ["string", "null"],
                                enum: ["critical", "high", "normal", "low", null],
                            },
                            due_date: { type: ["string", "null"] },
                            item_date: { type: ["string", "null"] },
                            item_time: { type: ["string", "null"] },
                            type: {
                                type: ["string", "null"],
                                enum: [
                                    "task",
                                    "deadline",
                                    "appointment",
                                    "payment",
                                    "document_followup",
                                    "reminder",
                                    null,
                                ],
                            },
                            location: { type: ["string", "null"], maxLength: 260 },
                        },
                    },
                },
            },
        },
    },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
    if (value === null || value === undefined) return null;
    const normalized = normalizeText(value, maxLength);
    return normalized || null;
}

function normalizeId(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function isUuid(value: unknown) {
    return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function isIsoDate(value: unknown) {
    return typeof value === "string" && ISO_DATE_PATTERN.test(value.trim());
}

function isTimeOrNull(value: unknown) {
    return value === null || value === undefined || (typeof value === "string" && (value.trim() === "" || TIME_PATTERN.test(value.trim())));
}

function normalizeDateOrNull(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    return isIsoDate(value) ? String(value).trim() : undefined;
}

function normalizeTimeOrNull(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    return typeof value === "string" && TIME_PATTERN.test(value.trim()) ? value.trim() : undefined;
}

function isTaskStatus(value: unknown): value is TropoRoadmapTaskStatus {
    return TROPO_TASK_STATUSES.includes(value as TropoRoadmapTaskStatus);
}

function isTaskPriority(value: unknown): value is TropoRoadmapTaskPriority {
    return TROPO_TASK_PRIORITIES.includes(value as TropoRoadmapTaskPriority);
}

function isCalendarType(value: unknown): value is TropoCalendarItemType {
    return TROPO_CALENDAR_TYPES.includes(value as TropoCalendarItemType);
}

function isCalendarStatus(value: unknown): value is TropoCalendarItemStatus {
    return TROPO_CALENDAR_STATUSES.includes(value as TropoCalendarItemStatus);
}

function isCalendarPriority(value: unknown): value is TropoCalendarItemPriority {
    return TROPO_CALENDAR_PRIORITIES.includes(value as TropoCalendarItemPriority);
}

function createActionId() {
    return `tropo-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function actionLabel(type: TropoActionType) {
    return {
        create_task: "Create task",
        update_task: "Update task",
        set_task_status: "Set task status",
        schedule_task: "Schedule task",
        create_calendar_item: "Create calendar item",
        update_calendar_item: "Update calendar item",
    }[type];
}

function baseAction(value: Record<string, unknown>) {
    const type = value.type;

    if (
        type !== "create_task" &&
        type !== "update_task" &&
        type !== "set_task_status" &&
        type !== "schedule_task" &&
        type !== "create_calendar_item" &&
        type !== "update_calendar_item"
    ) {
        return null;
    }

    return {
        id: normalizeText(value.id, 80) || createActionId(),
        type,
        label: normalizeText(value.label, 120) || actionLabel(type),
        reason: normalizeOptionalText(value.reason, 260),
    } as const;
}

export function validateTropoAction(value: unknown): ValidationResult {
    if (!isRecord(value)) return { ok: false, error: "Action must be an object" };

    const base = baseAction(value);
    if (!base) return { ok: false, error: "Unsupported action type" };

    const payload = value.payload;
    if (!isRecord(payload)) return { ok: false, error: "Action payload must be an object" };

    if (base.type === "create_task") {
        const stageId = normalizeId(payload.stage_id);
        const title = normalizeText(payload.title, 180);
        const dueDate = normalizeDateOrNull(payload.due_date);
        const status = payload.status ?? "open";
        const priority = payload.priority ?? "normal";

        if (!isUuid(stageId)) return { ok: false, error: "create_task.stage_id must be a valid stage id" };
        if (!title) return { ok: false, error: "create_task.title is required" };
        if (dueDate === undefined) return { ok: false, error: "create_task.due_date must be YYYY-MM-DD or null" };
        if (!isTaskStatus(status)) return { ok: false, error: "create_task.status is invalid" };
        if (!isTaskPriority(priority)) return { ok: false, error: "create_task.priority is invalid" };

        return {
            ok: true,
            action: {
                id: base.id,
                type: "create_task",
                label: base.label,
                reason: base.reason,
                payload: {
                    stage_id: stageId,
                    title,
                    note: normalizeOptionalText(payload.note, 1200),
                    status,
                    priority,
                    due_date: dueDate,
                },
            },
        };
    }

    if (base.type === "update_task") {
        const taskId = normalizeId(payload.task_id);
        const stageId = payload.stage_id === null || payload.stage_id === undefined ? null : normalizeId(payload.stage_id);
        const dueDate = normalizeDateOrNull(payload.due_date);
        const status = payload.status;
        const priority = payload.priority;
        const title = normalizeOptionalText(payload.title, 180);
        const note = normalizeOptionalText(payload.note, 1200);

        if (!isUuid(taskId)) return { ok: false, error: "update_task.task_id must be a valid task id" };
        if (stageId !== null && !isUuid(stageId)) return { ok: false, error: "update_task.stage_id must be a valid stage id or null" };
        if (dueDate === undefined) return { ok: false, error: "update_task.due_date must be YYYY-MM-DD or null" };
        if (status !== undefined && status !== null && !isTaskStatus(status)) return { ok: false, error: "update_task.status is invalid" };
        if (priority !== undefined && priority !== null && !isTaskPriority(priority)) return { ok: false, error: "update_task.priority is invalid" };

        const normalizedPayload: TropoUpdateTaskPayload = { task_id: taskId };
        if (stageId !== null) normalizedPayload.stage_id = stageId;
        if (title !== null) normalizedPayload.title = title;
        if ("note" in payload) normalizedPayload.note = note;
        if (status !== undefined && status !== null) normalizedPayload.status = status;
        if (priority !== undefined && priority !== null) normalizedPayload.priority = priority;
        if ("due_date" in payload) normalizedPayload.due_date = dueDate;

        if (Object.keys(normalizedPayload).length <= 1) {
            return { ok: false, error: "update_task needs at least one editable field" };
        }

        return { ok: true, action: { id: base.id, type: "update_task", label: base.label, reason: base.reason, payload: normalizedPayload } };
    }

    if (base.type === "set_task_status") {
        const taskId = normalizeId(payload.task_id);
        const status = payload.status;

        if (!isUuid(taskId)) return { ok: false, error: "set_task_status.task_id must be a valid task id" };
        if (status !== "done" && status !== "open") return { ok: false, error: "set_task_status.status must be done or open" };

        return { ok: true, action: { id: base.id, type: "set_task_status", label: base.label, reason: base.reason, payload: { task_id: taskId, status } } };
    }

    if (base.type === "schedule_task") {
        const taskId = normalizeId(payload.task_id);
        const itemDate = normalizeDateOrNull(payload.item_date);
        const itemTime = normalizeTimeOrNull(payload.item_time);

        if (!isUuid(taskId)) return { ok: false, error: "schedule_task.task_id must be a valid task id" };
        if (!itemDate) return { ok: false, error: "schedule_task.item_date must be YYYY-MM-DD" };
        if (itemTime === undefined || !isTimeOrNull(payload.item_time)) return { ok: false, error: "schedule_task.item_time must be HH:MM or null" };

        return { ok: true, action: { id: base.id, type: "schedule_task", label: base.label, reason: base.reason, payload: { task_id: taskId, item_date: itemDate, item_time: itemTime } } };
    }

    if (base.type === "create_calendar_item") {
        const title = normalizeText(payload.title, 180);
        const itemDate = normalizeDateOrNull(payload.item_date);
        const itemTime = normalizeTimeOrNull(payload.item_time);
        const type = payload.type ?? "reminder";
        const priority = payload.priority ?? "normal";
        const status = payload.status ?? "open";
        const taskId = payload.task_id === null || payload.task_id === undefined ? null : normalizeId(payload.task_id);

        if (!title) return { ok: false, error: "create_calendar_item.title is required" };
        if (!itemDate) return { ok: false, error: "create_calendar_item.item_date must be YYYY-MM-DD" };
        if (itemTime === undefined || !isTimeOrNull(payload.item_time)) return { ok: false, error: "create_calendar_item.item_time must be HH:MM or null" };
        if (!isCalendarType(type)) return { ok: false, error: "create_calendar_item.type is invalid" };
        if (!isCalendarPriority(priority)) return { ok: false, error: "create_calendar_item.priority is invalid" };
        if (!isCalendarStatus(status)) return { ok: false, error: "create_calendar_item.status is invalid" };
        if (taskId !== null && !isUuid(taskId)) return { ok: false, error: "create_calendar_item.task_id must be valid or null" };

        return {
            ok: true,
            action: {
                id: base.id,
                type: "create_calendar_item",
                label: base.label,
                reason: base.reason,
                payload: {
                    title,
                    item_date: itemDate,
                    item_time: itemTime,
                    type,
                    priority,
                    status,
                    location: normalizeOptionalText(payload.location, 260),
                    note: normalizeOptionalText(payload.note, 1200),
                    task_id: taskId,
                },
            },
        };
    }

    const calendarItemId = normalizeId(payload.calendar_item_id);
    const itemDate = normalizeDateOrNull(payload.item_date);
    const itemTime = normalizeTimeOrNull(payload.item_time);
    const type = payload.type;
    const priority = payload.priority;
    const status = payload.status;
    const taskId = payload.task_id === null || payload.task_id === undefined ? null : normalizeId(payload.task_id);
    const title = normalizeOptionalText(payload.title, 180);
    const note = normalizeOptionalText(payload.note, 1200);
    const location = normalizeOptionalText(payload.location, 260);

    if (!isUuid(calendarItemId)) return { ok: false, error: "update_calendar_item.calendar_item_id must be a valid calendar item id" };
    if (itemDate === undefined) return { ok: false, error: "update_calendar_item.item_date must be YYYY-MM-DD or null" };
    if (itemTime === undefined || !isTimeOrNull(payload.item_time)) return { ok: false, error: "update_calendar_item.item_time must be HH:MM or null" };
    if (type !== undefined && type !== null && !isCalendarType(type)) return { ok: false, error: "update_calendar_item.type is invalid" };
    if (priority !== undefined && priority !== null && !isCalendarPriority(priority)) return { ok: false, error: "update_calendar_item.priority is invalid" };
    if (status !== undefined && status !== null && !isCalendarStatus(status)) return { ok: false, error: "update_calendar_item.status is invalid" };
    if (taskId !== null && !isUuid(taskId)) return { ok: false, error: "update_calendar_item.task_id must be valid or null" };

    const normalizedPayload: TropoUpdateCalendarItemPayload = { calendar_item_id: calendarItemId };
    if (taskId !== null) normalizedPayload.task_id = taskId;
    if (title !== null) normalizedPayload.title = title;
    if ("item_date" in payload && itemDate !== null) normalizedPayload.item_date = itemDate;
    if ("item_time" in payload) normalizedPayload.item_time = itemTime;
    if (type !== undefined && type !== null) normalizedPayload.type = type;
    if (priority !== undefined && priority !== null) normalizedPayload.priority = priority;
    if (status !== undefined && status !== null) normalizedPayload.status = status;
    if ("location" in payload) normalizedPayload.location = location;
    if ("note" in payload) normalizedPayload.note = note;

    if (Object.keys(normalizedPayload).length <= 1) {
        return { ok: false, error: "update_calendar_item needs at least one editable field" };
    }

    return { ok: true, action: { id: base.id, type: "update_calendar_item", label: base.label, reason: base.reason, payload: normalizedPayload } };
}

export function normalizeTropoActions(value: unknown): TropoProposedAction[] {
    if (!Array.isArray(value)) return [];

    const actions: TropoProposedAction[] = [];

    for (const item of value) {
        const result = validateTropoAction(item);
        if (result.ok) actions.push(result.action);
        if (actions.length >= 3) break;
    }

    return actions;
}

export function parseTropoAssistantTurn(text: string): TropoAssistantTurn {
    const trimmed = text.trim();
    const withoutFence = trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");

    if (objectStart < 0 || objectEnd < objectStart) {
        throw new Error("Tropo did not return a structured response");
    }

    const parsed = JSON.parse(withoutFence.slice(objectStart, objectEnd + 1)) as unknown;

    if (!isRecord(parsed)) {
        throw new Error("Tropo response must be an object");
    }

    const reply = normalizeText(parsed.reply, 5000);

    if (!reply) {
        throw new Error("Tropo response is missing reply text");
    }

    return {
        reply,
        proposed_actions: normalizeTropoActions(parsed.proposed_actions),
    };
}

export function getTropoActionTypeLabel(type: TropoActionType) {
    return actionLabel(type);
}
