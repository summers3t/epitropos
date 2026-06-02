import { createClient } from "@/lib/supabase/client";

export type ManagedProperty = {
    id: string;
    slug: string;
    name: string;
    display_name: string | null;
    property_type: string;
    country: string;
    city: string | null;
    area: string | null;
    address: string | null;
    status: string;
    ownership_status: string;
    acquisition_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRoadmapStageStatus = "completed" | "current" | "upcoming" | "deferred";
export type ManagedPropertyRoadmapTaskStatus = "done" | "pending" | "scheduled" | "open" | "deferred";
export type ManagedPropertyRoadmapTaskPriority = "critical" | "high" | "normal" | "low";

export type ManagedPropertyRoadmapStage = {
    id: string;
    managed_property_id: string;
    stable_key: string;
    title: string;
    description: string | null;
    status: ManagedPropertyRoadmapStageStatus;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRoadmapStageInsert = Omit<
    ManagedPropertyRoadmapStage,
    "id" | "created_at" | "updated_at"
>;

export type ManagedPropertyRoadmapStagePatch = Partial<
    Pick<
        ManagedPropertyRoadmapStage,
        | "stable_key"
        | "title"
        | "description"
        | "status"
        | "sort_order"
    >
>;

export type ManagedPropertyRoadmapTask = {
    id: string;
    managed_property_id: string;
    stage_id: string | null;
    stable_key: string | null;
    title: string;
    note: string | null;
    status: ManagedPropertyRoadmapTaskStatus;
    priority: ManagedPropertyRoadmapTaskPriority;
    due_date: string | null;
    completed_at: string | null;
    sort_order: number;
    calendar_item_id: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRoadmapTaskInsert = Omit<
    ManagedPropertyRoadmapTask,
    "id" | "created_at" | "updated_at" | "completed_at" | "calendar_item_id"
> & {
    completed_at?: string | null;
    calendar_item_id?: string | null;
};

export type ManagedPropertyRoadmapTaskPatch = Partial<
    Pick<
        ManagedPropertyRoadmapTask,
        | "stage_id"
        | "stable_key"
        | "title"
        | "note"
        | "status"
        | "priority"
        | "due_date"
        | "completed_at"
        | "sort_order"
        | "calendar_item_id"
    >
>;

export type ManagedPropertyRoadmap = {
    stages: ManagedPropertyRoadmapStage[];
    tasks: ManagedPropertyRoadmapTask[];
};

export type ManagedPropertyExpenseCategory =
    | "bg_documents"
    | "greek_setup"
    | "credit_dsk"
    | "greek_closing"
    | "post_acquisition"
    | "repairs"
    | "utilities"
    | "tax"
    | "other";

export type ManagedPropertyExpenseStatus = "paid" | "pending" | "planned" | "excluded";

export type ManagedPropertyExpense = {
    id: string;
    managed_property_id: string;
    title: string;
    category: ManagedPropertyExpenseCategory;
    issuer: string | null;
    note: string | null;
    amount_eur: number;
    amount_bgn: number | null;
    fx_rate: number | null;
    expense_date: string | null;
    status: ManagedPropertyExpenseStatus;
    source: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyExpenseInsert = Omit<
    ManagedPropertyExpense,
    "id" | "created_at" | "updated_at"
>;

export type ManagedPropertyExpensePatch = Partial<
    Pick<
        ManagedPropertyExpense,
        | "title"
        | "category"
        | "issuer"
        | "note"
        | "amount_eur"
        | "amount_bgn"
        | "fx_rate"
        | "expense_date"
        | "status"
        | "source"
        | "sort_order"
    >
>;

export type ManagedPropertyDocumentStatus =
    | "available"
    | "watchlist"
    | "trace_only"
    | "pending"
    | "missing"
    | "deferred"
    | "weak_evidence";

export type ManagedPropertyDocumentPriority = "critical" | "high" | "medium" | "low";

export type ManagedPropertyDocumentCategory = {
    id: string;
    managed_property_id: string;
    stable_key: string;
    name: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyDocumentCategoryInsert = Omit<
    ManagedPropertyDocumentCategory,
    "id" | "created_at" | "updated_at"
>;

export type ManagedPropertyDocumentCategoryPatch = Partial<
    Pick<ManagedPropertyDocumentCategory, "stable_key" | "name" | "description" | "sort_order">
>;

export type ManagedPropertyDocument = {
    id: string;
    managed_property_id: string;
    category_id: string | null;
    title: string;
    file_name: string | null;
    storage_path: string | null;
    source: string | null;
    proves: string | null;
    control_note: string | null;
    next_action: string | null;
    document_date: string | null;
    amount_eur: number | null;
    status: ManagedPropertyDocumentStatus;
    priority: ManagedPropertyDocumentPriority;
    tags: string[];
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyDocumentInsert = Omit<
    ManagedPropertyDocument,
    "id" | "created_at" | "updated_at"
>;

export type ManagedPropertyDocumentPatch = Partial<
    Pick<
        ManagedPropertyDocument,
        | "category_id"
        | "title"
        | "file_name"
        | "storage_path"
        | "source"
        | "proves"
        | "control_note"
        | "next_action"
        | "document_date"
        | "amount_eur"
        | "status"
        | "priority"
        | "tags"
        | "sort_order"
    >
>;

function normalizeError(error: unknown) {
    if (error instanceof Error) return error.message;

    if (typeof error === "object" && error !== null && "message" in error) {
        return String((error as { message?: unknown }).message);
    }

    return "Unknown Supabase error";
}

function throwIfError(error: unknown, context: string): never {
    throw new Error(`${context}: ${normalizeError(error)}`);
}

export async function getManagedPropertyBySlug(slug: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_properties")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) throwIfError(error, "Failed to load managed property");

    return data as ManagedProperty;
}

export async function getManagedPropertyRoadmap(managedPropertyId: string) {
    const supabase = createClient();

    const [stagesResult, tasksResult] = await Promise.all([
        supabase
            .from("managed_property_roadmap_stages")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase
            .from("managed_property_tasks")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
    ]);

    if (stagesResult.error) throwIfError(stagesResult.error, "Failed to load roadmap stages");
    if (tasksResult.error) throwIfError(tasksResult.error, "Failed to load roadmap tasks");

    return {
        stages: (stagesResult.data ?? []) as ManagedPropertyRoadmapStage[],
        tasks: (tasksResult.data ?? []) as ManagedPropertyRoadmapTask[],
    };
}

export async function createManagedPropertyRoadmapStage(payload: ManagedPropertyRoadmapStageInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_roadmap_stages")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create roadmap stage");

    return data as ManagedPropertyRoadmapStage;
}

export async function updateManagedPropertyRoadmapStage(
    id: string,
    patch: ManagedPropertyRoadmapStagePatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_roadmap_stages")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update roadmap stage");

    return data as ManagedPropertyRoadmapStage;
}

export async function deleteManagedPropertyRoadmapStage(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_roadmap_stages")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete roadmap stage");
}

export async function createManagedPropertyTask(payload: ManagedPropertyRoadmapTaskInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_tasks")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create roadmap task");

    return data as ManagedPropertyRoadmapTask;
}

export async function updateManagedPropertyTask(
    id: string,
    patch: ManagedPropertyRoadmapTaskPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_tasks")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update roadmap task");

    const task = data as ManagedPropertyRoadmapTask;

    if (patch.status === "done" && task.calendar_item_id) {
        const { error: calendarError } = await supabase
            .from("managed_property_calendar_items")
            .update({ status: "done" })
            .eq("id", task.calendar_item_id);

        if (calendarError) throwIfError(calendarError, "Failed to sync linked calendar item status");
    }

    return task;
}

export async function deleteManagedPropertyTask(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_tasks")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete roadmap task");
}

export async function getCalendarItemById(id: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throwIfError(error, "Failed to load calendar item");

    return data as ManagedPropertyCalendarItem | null;
}

export async function getCalendarItemsByTaskId(taskId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .select("*")
        .eq("task_id", taskId)
        .order("item_date", { ascending: true })
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("item_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

    if (error) throwIfError(error, "Failed to load calendar items for task");

    return (data ?? []) as ManagedPropertyCalendarItem[];
}

export async function getManagedPropertyExpenses(managedPropertyId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_expenses")
        .select("*")
        .eq("managed_property_id", managedPropertyId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (error) throwIfError(error, "Failed to load managed property expenses");

    return (data ?? []) as ManagedPropertyExpense[];
}

export async function createManagedPropertyExpense(payload: ManagedPropertyExpenseInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_expenses")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create managed property expense");

    return data as ManagedPropertyExpense;
}

export async function updateManagedPropertyExpense(
    id: string,
    patch: ManagedPropertyExpensePatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_expenses")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property expense");

    return data as ManagedPropertyExpense;
}

export async function deleteManagedPropertyExpense(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_expenses")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete managed property expense");
}

export async function getManagedPropertyDocuments(managedPropertyId: string) {
    const supabase = createClient();

    const [categoriesResult, documentsResult] = await Promise.all([
        supabase
            .from("managed_property_document_categories")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase
            .from("managed_property_documents")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
    ]);

    if (categoriesResult.error) {
        throwIfError(categoriesResult.error, "Failed to load managed property document categories");
    }

    if (documentsResult.error) {
        throwIfError(documentsResult.error, "Failed to load managed property documents");
    }

    return {
        categories: (categoriesResult.data ?? []) as ManagedPropertyDocumentCategory[],
        documents: (documentsResult.data ?? []) as ManagedPropertyDocument[],
    };
}

export async function createManagedPropertyDocument(payload: ManagedPropertyDocumentInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_documents")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create managed property document");

    return data as ManagedPropertyDocument;
}

export async function updateManagedPropertyDocument(
    id: string,
    patch: ManagedPropertyDocumentPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_documents")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property document");

    return data as ManagedPropertyDocument;
}

export async function deleteManagedPropertyDocument(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_documents")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete managed property document");
}

export async function createManagedPropertyDocumentCategory(
    payload: ManagedPropertyDocumentCategoryInsert,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_document_categories")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create managed property document category");

    return data as ManagedPropertyDocumentCategory;
}

export async function updateManagedPropertyDocumentCategory(
    id: string,
    patch: ManagedPropertyDocumentCategoryPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_document_categories")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property document category");

    return data as ManagedPropertyDocumentCategory;
}

export async function deleteManagedPropertyDocumentCategory(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_document_categories")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete managed property document category");
}

export type ManagedPropertyIncomeMonthStatus = "no_rent" | "unpaid" | "partial" | "paid";

export type ManagedPropertyIncomeMonth = {
    id: string;
    managed_property_id: string;
    year: number;
    month: number;
    rent_expected_eur: number;
    rent_paid_eur: number;
    rent_paid_date: string | null;
    rent_status: ManagedPropertyIncomeMonthStatus;
    electricity_confirmed: boolean;
    water_confirmed: boolean;
    gas_confirmed: boolean;
    building_fees_confirmed: boolean;
    note: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyIncomeMonthPatch = Partial<
    Pick<
        ManagedPropertyIncomeMonth,
        | "rent_expected_eur"
        | "rent_paid_eur"
        | "rent_paid_date"
        | "rent_status"
        | "electricity_confirmed"
        | "water_confirmed"
        | "gas_confirmed"
        | "building_fees_confirmed"
        | "note"
    >
>;

export type ManagedPropertyIncomeOwnerExpense = {
    id: string;
    managed_property_id: string;
    income_month_id: string | null;
    title: string;
    amount_eur: number;
    expense_date: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyIncomeOwnerExpenseInsert = Omit<
    ManagedPropertyIncomeOwnerExpense,
    "id" | "created_at" | "updated_at"
>;

export type ManagedPropertyTaxReserve = {
    id: string;
    managed_property_id: string;
    year: number;
    tax_rate_percent: number;
    estimated_tax_eur: number;
    due_date: string | null;
    paid: boolean;
    paid_date: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyTaxReservePatch = Partial<
    Pick<ManagedPropertyTaxReserve, "tax_rate_percent" | "estimated_tax_eur" | "due_date" | "paid" | "paid_date" | "note">
>;

export async function getManagedPropertyIncome(managedPropertyId: string, year: number) {
    const supabase = createClient();

    const [monthsResult, ownerExpensesResult, taxReserveResult] = await Promise.all([
        supabase
            .from("managed_property_income_months")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .eq("year", year)
            .order("month", { ascending: true }),
        supabase
            .from("managed_property_income_owner_expenses")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("expense_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false }),
        supabase
            .from("managed_property_tax_reserve")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .eq("year", year)
            .maybeSingle(),
    ]);

    if (monthsResult.error) throwIfError(monthsResult.error, "Failed to load managed property income months");
    if (ownerExpensesResult.error) throwIfError(ownerExpensesResult.error, "Failed to load managed property owner expenses");
    if (taxReserveResult.error) throwIfError(taxReserveResult.error, "Failed to load managed property tax reserve");

    return {
        months: (monthsResult.data ?? []) as ManagedPropertyIncomeMonth[],
        ownerExpenses: (ownerExpensesResult.data ?? []) as ManagedPropertyIncomeOwnerExpense[],
        taxReserve: taxReserveResult.data as ManagedPropertyTaxReserve | null,
    };
}

export async function updateManagedPropertyIncomeMonth(
    id: string,
    patch: ManagedPropertyIncomeMonthPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_income_months")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property income month");

    return data as ManagedPropertyIncomeMonth;
}

export async function updateManagedPropertyIncomeMonths(
    patches: Array<{ id: string; patch: ManagedPropertyIncomeMonthPatch }>,
) {
    const updated: ManagedPropertyIncomeMonth[] = [];

    for (const item of patches) {
        updated.push(await updateManagedPropertyIncomeMonth(item.id, item.patch));
    }

    return updated;
}

export async function createManagedPropertyIncomeOwnerExpense(
    payload: ManagedPropertyIncomeOwnerExpenseInsert,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_income_owner_expenses")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create managed property owner expense");

    return data as ManagedPropertyIncomeOwnerExpense;
}

export async function deleteManagedPropertyIncomeOwnerExpense(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_income_owner_expenses")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete managed property owner expense");
}

export async function updateManagedPropertyTaxReserve(
    id: string,
    patch: ManagedPropertyTaxReservePatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_tax_reserve")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property tax reserve");

    return data as ManagedPropertyTaxReserve;
}

export type ManagedPropertyCalendarItemType =
    | "task"
    | "deadline"
    | "appointment"
    | "payment"
    | "document_followup"
    | "reminder";

export type ManagedPropertyCalendarItemStatus = "open" | "done" | "deferred";
export type ManagedPropertyCalendarItemPriority = "critical" | "high" | "normal" | "low";

export type ManagedPropertyCalendarLinkedRecord = {
    label: string;
    kind: "Task" | "Document" | "Expense" | "Stage" | "Contact";
};

export type ManagedPropertyCalendarItem = {
    id: string;
    managed_property_id: string;
    task_id: string | null;
    title: string;
    item_date: string;
    item_time: string | null;
    type: ManagedPropertyCalendarItemType;
    priority: ManagedPropertyCalendarItemPriority;
    status: ManagedPropertyCalendarItemStatus;
    location: string | null;
    note: string | null;
    linked_records: ManagedPropertyCalendarLinkedRecord[];
    sort_order: number | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyCalendarItemInsert = Omit<
    ManagedPropertyCalendarItem,
    "id" | "created_at" | "updated_at" | "task_id" | "sort_order"
> &
    Partial<Pick<ManagedPropertyCalendarItem, "task_id" | "sort_order">>;

export type ManagedPropertyCalendarItemPatch = Partial<
    Pick<
        ManagedPropertyCalendarItem,
        | "task_id"
        | "title"
        | "item_date"
        | "item_time"
        | "type"
        | "priority"
        | "status"
        | "location"
        | "note"
        | "linked_records"
        | "sort_order"
    >
>;

export async function getManagedPropertyCalendarItems(managedPropertyId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .select("*")
        .eq("managed_property_id", managedPropertyId)
        .order("item_date", { ascending: true })
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("item_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

    if (error) throwIfError(error, "Failed to load managed property calendar items");

    return (data ?? []) as ManagedPropertyCalendarItem[];
}

export async function createManagedPropertyCalendarItem(payload: ManagedPropertyCalendarItemInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create managed property calendar item");

    return data as ManagedPropertyCalendarItem;
}

export async function updateManagedPropertyCalendarItem(
    id: string,
    patch: ManagedPropertyCalendarItemPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_calendar_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update managed property calendar item");

    const calendarItem = data as ManagedPropertyCalendarItem;

    if (patch.status && calendarItem.task_id) {
        const taskPatch: ManagedPropertyRoadmapTaskPatch =
            patch.status === "done"
                ? { status: "done", completed_at: new Date().toISOString() }
                : patch.status === "open"
                    ? { status: "scheduled", completed_at: null }
                    : { status: "deferred", completed_at: null };

        const { error: taskError } = await supabase
            .from("managed_property_tasks")
            .update(taskPatch)
            .eq("id", calendarItem.task_id);

        if (taskError) throwIfError(taskError, "Failed to sync linked roadmap task status");
    }

    return calendarItem;
}

export async function scheduleManagedPropertyTask({
    managedPropertyId,
    task,
    itemDate,
    itemTime,
}: {
    managedPropertyId: string;
    task: ManagedPropertyRoadmapTask;
    itemDate: string;
    itemTime?: string | null;
}) {
    const supabase = createClient();

    const calendarPayload: ManagedPropertyCalendarItemInsert = {
        managed_property_id: managedPropertyId,
        task_id: task.id,
        title: task.title,
        item_date: itemDate,
        item_time: itemTime?.trim() || null,
        type: "task",
        priority: task.priority,
        status: task.status === "done" ? "done" : "open",
        location: null,
        note: task.note,
        linked_records: [{ kind: "Task", label: task.title }],
        sort_order: null,
    };

    const calendarResult = task.calendar_item_id
        ? await supabase
            .from("managed_property_calendar_items")
            .update(calendarPayload)
            .eq("id", task.calendar_item_id)
            .select("*")
            .single()
        : await supabase
            .from("managed_property_calendar_items")
            .insert(calendarPayload)
            .select("*")
            .single();

    if (calendarResult.error) {
        throwIfError(
            calendarResult.error,
            task.calendar_item_id ? "Failed to reschedule roadmap task" : "Failed to schedule roadmap task",
        );
    }

    const calendarItem = calendarResult.data as ManagedPropertyCalendarItem;
    const nextTaskStatus: ManagedPropertyRoadmapTaskStatus =
        task.status === "done" ? "done" : "scheduled";

    const { data: updatedTask, error: taskError } = await supabase
        .from("managed_property_tasks")
        .update({
            calendar_item_id: calendarItem.id,
            due_date: itemDate,
            status: nextTaskStatus,
        })
        .eq("id", task.id)
        .select("*")
        .single();

    if (taskError) throwIfError(taskError, "Failed to link roadmap task to calendar item");

    return {
        calendarItem,
        task: updatedTask as ManagedPropertyRoadmapTask,
    };
}

export async function deleteManagedPropertyCalendarItem(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_calendar_items")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete managed property calendar item");
}
