import type { SupabaseClient } from "@supabase/supabase-js";
import {
    validateTropoAction,
    type TropoCalendarItemStatus,
    type TropoProposedAction,
    type TropoRoadmapTaskStatus,
} from "@/lib/admin/tropoActionSchemas";

type DbRow = Record<string, unknown>;

type CreatedTaskRow = { id: string };
type UpdatedTaskRow = {
    id: string;
    title: string | null;
    calendar_item_id: string | null;
    status?: TropoRoadmapTaskStatus | null;
};
type CalendarIdRow = { id: string };
type UpdatedCalendarItemRow = {
    id: string;
    title: string | null;
    task_id: string | null;
    status?: TropoCalendarItemStatus | null;
};

function requireReturnedRow<T>(label: string, data: T | null): T {
    if (!data) {
        throw new Error(`${label}: database did not return the changed row`);
    }

    return data;
}

export type TropoActionExecutionResult = {
    actionId: string;
    actionType: TropoProposedAction["type"];
    message: string;
    records: {
        taskId?: string;
        calendarItemId?: string;
        stageId?: string;
    };
};

function throwQueryError(label: string, error: { message?: string } | null) {
    if (!error) return;
    throw new Error(`${label}: ${error.message ?? "Unknown database error"}`);
}

function todayIsoTimestamp() {
    return new Date().toISOString();
}

function calendarStatusFromTaskStatus(status: TropoRoadmapTaskStatus): TropoCalendarItemStatus {
    if (status === "done") return "done";
    if (status === "deferred") return "deferred";
    return "open";
}

function taskStatusFromCalendarStatus(status: TropoCalendarItemStatus): TropoRoadmapTaskStatus {
    if (status === "done") return "done";
    if (status === "deferred") return "deferred";
    return "scheduled";
}

async function getProjectId(supabase: SupabaseClient, projectSlug: string) {
    const { data, error } = await supabase
        .from("managed_properties")
        .select("id")
        .eq("slug", projectSlug)
        .maybeSingle();

    throwQueryError("Failed to load project", error);

    if (!data?.id) {
        throw new Error("Project not found");
    }

    return String(data.id);
}

async function requireStage(supabase: SupabaseClient, projectId: string, stageId: string) {
    const { data, error } = await supabase
        .from("managed_property_roadmap_stages")
        .select("id, title")
        .eq("id", stageId)
        .eq("managed_property_id", projectId)
        .maybeSingle();

    throwQueryError("Failed to verify roadmap stage", error);

    if (!data?.id) {
        throw new Error("The selected roadmap stage does not belong to this project");
    }

    return data as DbRow;
}

async function requireTask(supabase: SupabaseClient, projectId: string, taskId: string) {
    const { data, error } = await supabase
        .from("managed_property_tasks")
        .select("*")
        .eq("id", taskId)
        .eq("managed_property_id", projectId)
        .maybeSingle();

    throwQueryError("Failed to verify roadmap task", error);

    if (!data?.id) {
        throw new Error("The selected roadmap task does not belong to this project");
    }

    return data as DbRow;
}

async function requireCalendarItem(supabase: SupabaseClient, projectId: string, calendarItemId: string) {
    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .select("*")
        .eq("id", calendarItemId)
        .eq("managed_property_id", projectId)
        .maybeSingle();

    throwQueryError("Failed to verify calendar item", error);

    if (!data?.id) {
        throw new Error("The selected calendar item does not belong to this project");
    }

    return data as DbRow;
}

async function nextTaskSortOrder(supabase: SupabaseClient, projectId: string, stageId: string) {
    const { data, error } = await supabase
        .from("managed_property_tasks")
        .select("sort_order")
        .eq("managed_property_id", projectId)
        .eq("stage_id", stageId)
        .order("sort_order", { ascending: false })
        .limit(1);

    throwQueryError("Failed to calculate task sort order", error);

    const highest = Number((data?.[0] as { sort_order?: unknown } | undefined)?.sort_order ?? 0);
    return (Number.isFinite(highest) ? highest : 0) + 1000;
}

async function syncCalendarFromTaskStatus(
    supabase: SupabaseClient,
    calendarItemId: unknown,
    status: TropoRoadmapTaskStatus,
) {
    if (typeof calendarItemId !== "string" || !calendarItemId) return;

    const { error } = await supabase
        .from("managed_property_calendar_items")
        .update({ status: calendarStatusFromTaskStatus(status) })
        .eq("id", calendarItemId);

    throwQueryError("Failed to sync linked calendar item", error);
}

async function syncTaskFromCalendarStatus(
    supabase: SupabaseClient,
    taskId: unknown,
    status: TropoCalendarItemStatus,
) {
    if (typeof taskId !== "string" || !taskId) return;

    const nextStatus = taskStatusFromCalendarStatus(status);
    const { error } = await supabase
        .from("managed_property_tasks")
        .update({
            status: nextStatus,
            completed_at: nextStatus === "done" ? todayIsoTimestamp() : null,
        })
        .eq("id", taskId);

    throwQueryError("Failed to sync linked roadmap task", error);
}

export async function executeTropoAction(args: {
    supabase: SupabaseClient;
    projectSlug: string;
    action: unknown;
}): Promise<TropoActionExecutionResult> {
    const validation = validateTropoAction(args.action);

    if (!validation.ok) {
        throw new Error(validation.error);
    }

    const action = validation.action;
    const projectId = await getProjectId(args.supabase, args.projectSlug);
    const { supabase } = args;

    if (action.type === "create_task") {
        const payload = action.payload;
        await requireStage(supabase, projectId, payload.stage_id);
        const sortOrder = await nextTaskSortOrder(supabase, projectId, payload.stage_id);
        const status = payload.status ?? "open";

        const { data, error } = await supabase
            .from("managed_property_tasks")
            .insert({
                managed_property_id: projectId,
                stage_id: payload.stage_id,
                stable_key: null,
                title: payload.title,
                note: payload.note ?? null,
                status,
                priority: payload.priority ?? "normal",
                due_date: payload.due_date ?? null,
                completed_at: status === "done" ? todayIsoTimestamp() : null,
                sort_order: sortOrder,
                calendar_item_id: null,
            })
            .select("id")
            .single();

        throwQueryError("Failed to create roadmap task", error);
        const createdTask = requireReturnedRow<CreatedTaskRow>("Failed to create roadmap task", data);

        return {
            actionId: action.id,
            actionType: action.type,
            message: `Task created: ${payload.title}`,
            records: { taskId: String(createdTask.id), stageId: payload.stage_id },
        };
    }

    if (action.type === "update_task") {
        const payload = action.payload;
        const task = await requireTask(supabase, projectId, payload.task_id);

        if (payload.stage_id) {
            await requireStage(supabase, projectId, payload.stage_id);
        }

        const patch: DbRow = {};
        if (payload.stage_id) patch.stage_id = payload.stage_id;
        if (payload.title !== undefined) patch.title = payload.title;
        if ("note" in payload) patch.note = payload.note ?? null;
        if (payload.status !== undefined) {
            patch.status = payload.status;
            patch.completed_at = payload.status === "done" ? todayIsoTimestamp() : null;
        }
        if (payload.priority !== undefined) patch.priority = payload.priority;
        if ("due_date" in payload) patch.due_date = payload.due_date ?? null;

        const { data, error } = await supabase
            .from("managed_property_tasks")
            .update(patch)
            .eq("id", payload.task_id)
            .eq("managed_property_id", projectId)
            .select("id, title, calendar_item_id, status")
            .single();

        throwQueryError("Failed to update roadmap task", error);
        const updatedTask = requireReturnedRow<UpdatedTaskRow>("Failed to update roadmap task", data);

        if (payload.status !== undefined) {
            await syncCalendarFromTaskStatus(supabase, updatedTask.calendar_item_id ?? task.calendar_item_id, payload.status);
        }

        return {
            actionId: action.id,
            actionType: action.type,
            message: `Task updated: ${String(updatedTask.title ?? payload.task_id)}`,
            records: { taskId: payload.task_id, stageId: payload.stage_id ?? String(task.stage_id ?? "") },
        };
    }

    if (action.type === "set_task_status") {
        const payload = action.payload;
        const task = await requireTask(supabase, projectId, payload.task_id);

        const { data, error } = await supabase
            .from("managed_property_tasks")
            .update({
                status: payload.status,
                completed_at: payload.status === "done" ? todayIsoTimestamp() : null,
            })
            .eq("id", payload.task_id)
            .eq("managed_property_id", projectId)
            .select("id, title, calendar_item_id")
            .single();

        throwQueryError("Failed to update task status", error);
        const updatedTask = requireReturnedRow<UpdatedTaskRow>("Failed to update task status", data);
        await syncCalendarFromTaskStatus(supabase, updatedTask.calendar_item_id ?? task.calendar_item_id, payload.status);

        return {
            actionId: action.id,
            actionType: action.type,
            message: `Task marked ${payload.status}: ${String(updatedTask.title ?? payload.task_id)}`,
            records: { taskId: payload.task_id, stageId: String(task.stage_id ?? "") },
        };
    }

    if (action.type === "schedule_task") {
        const payload = action.payload;
        const task = await requireTask(supabase, projectId, payload.task_id);
        const existingCalendarItemId = typeof task.calendar_item_id === "string" ? task.calendar_item_id : null;
        const calendarPayload = {
            managed_property_id: projectId,
            task_id: payload.task_id,
            title: String(task.title ?? "Scheduled task"),
            item_date: payload.item_date,
            item_time: payload.item_time ?? null,
            type: "task",
            priority: task.priority ?? "normal",
            status: task.status === "done" ? "done" : "open",
            location: null,
            note: task.note ?? null,
            linked_records: [{ kind: "Task", label: String(task.title ?? "Task") }],
            sort_order: null,
        };

        const calendarResult = existingCalendarItemId
            ? await supabase
                .from("managed_property_calendar_items")
                .update(calendarPayload)
                .eq("id", existingCalendarItemId)
                .eq("managed_property_id", projectId)
                .select("id")
                .single()
            : await supabase
                .from("managed_property_calendar_items")
                .insert(calendarPayload)
                .select("id")
                .single();

        throwQueryError("Failed to schedule task", calendarResult.error);
        const calendarRow = requireReturnedRow<CalendarIdRow>("Failed to schedule task", calendarResult.data);

        const calendarItemId = String(calendarRow.id);
        const { error: taskError } = await supabase
            .from("managed_property_tasks")
            .update({
                calendar_item_id: calendarItemId,
                due_date: payload.item_date,
                status: task.status === "done" ? "done" : "scheduled",
            })
            .eq("id", payload.task_id)
            .eq("managed_property_id", projectId);

        throwQueryError("Failed to link scheduled task", taskError);

        return {
            actionId: action.id,
            actionType: action.type,
            message: `Task scheduled: ${String(task.title ?? payload.task_id)}`,
            records: { taskId: payload.task_id, calendarItemId, stageId: String(task.stage_id ?? "") },
        };
    }

    if (action.type === "create_calendar_item") {
        const payload = action.payload;

        if (payload.task_id) {
            await requireTask(supabase, projectId, payload.task_id);
        }

        const { data, error } = await supabase
            .from("managed_property_calendar_items")
            .insert({
                managed_property_id: projectId,
                task_id: payload.task_id ?? null,
                title: payload.title,
                item_date: payload.item_date,
                item_time: payload.item_time ?? null,
                type: payload.type ?? "reminder",
                priority: payload.priority ?? "normal",
                status: payload.status ?? "open",
                location: payload.location ?? null,
                note: payload.note ?? null,
                linked_records: payload.task_id ? [{ kind: "Task", label: payload.title }] : [],
                sort_order: null,
            })
            .select("id")
            .single();

        throwQueryError("Failed to create calendar item", error);
        const createdCalendarItem = requireReturnedRow<CalendarIdRow>("Failed to create calendar item", data);

        return {
            actionId: action.id,
            actionType: action.type,
            message: `Calendar item created: ${payload.title}`,
            records: { calendarItemId: String(createdCalendarItem.id), taskId: payload.task_id ?? undefined },
        };
    }

    const payload = action.payload;
    const calendarItem = await requireCalendarItem(supabase, projectId, payload.calendar_item_id);

    if (payload.task_id) {
        await requireTask(supabase, projectId, payload.task_id);
    }

    const patch: DbRow = {};
    if ("task_id" in payload) patch.task_id = payload.task_id ?? null;
    if (payload.title !== undefined) patch.title = payload.title;
    if (payload.item_date !== undefined) patch.item_date = payload.item_date;
    if ("item_time" in payload) patch.item_time = payload.item_time ?? null;
    if (payload.type !== undefined) patch.type = payload.type;
    if (payload.priority !== undefined) patch.priority = payload.priority;
    if (payload.status !== undefined) patch.status = payload.status;
    if ("location" in payload) patch.location = payload.location ?? null;
    if ("note" in payload) patch.note = payload.note ?? null;

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .update(patch)
        .eq("id", payload.calendar_item_id)
        .eq("managed_property_id", projectId)
        .select("id, title, task_id, status")
        .single();

    throwQueryError("Failed to update calendar item", error);
    const updatedCalendarItem = requireReturnedRow<UpdatedCalendarItemRow>("Failed to update calendar item", data);

    if (payload.status !== undefined) {
        await syncTaskFromCalendarStatus(supabase, updatedCalendarItem.task_id ?? calendarItem.task_id, payload.status);
    }

    return {
        actionId: action.id,
        actionType: action.type,
        message: `Calendar item updated: ${String(updatedCalendarItem.title ?? payload.calendar_item_id)}`,
        records: { calendarItemId: payload.calendar_item_id, taskId: String(updatedCalendarItem.task_id ?? "") || undefined },
    };
}
