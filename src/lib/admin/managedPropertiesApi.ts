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
export type ManagedPropertyRoadmapTaskStatus = "done" | "pending" | "scheduled" | "open" | "deferred" | "in_progress" | "watch" | "blocked" | "dropped";
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

function isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;

    const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    const details = typeof candidate.details === "string" ? candidate.details : "";

    return code === "23505" || `${message} ${details}`.toLowerCase().includes("duplicate key value violates unique constraint");
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

export const MANAGED_PROPERTY_DOCUMENTS_BUCKET = "managed-property-documents";

function sanitizeStorageFileName(fileName: string) {
    const cleanName = fileName
        .normalize("NFKD")
        .replace(/[^\w.\-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return cleanName || "document-file";
}

function buildManagedPropertyDocumentStoragePath({
    managedPropertyId,
    documentId,
    fileName,
}: {
    managedPropertyId: string;
    documentId: string;
    fileName: string;
}) {
    const safeName = sanitizeStorageFileName(fileName);
    const uniqueSuffix =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`;

    return `managed-properties/${managedPropertyId}/documents/${documentId}/${uniqueSuffix}-${safeName}`;
}

export async function uploadManagedPropertyDocumentFile({
    managedPropertyId,
    documentId,
    file,
    previousStoragePath,
}: {
    managedPropertyId: string;
    documentId: string;
    file: File;
    previousStoragePath?: string | null;
}) {
    const supabase = createClient();
    const storagePath = buildManagedPropertyDocumentStoragePath({
        managedPropertyId,
        documentId,
        fileName: file.name,
    });

    const { error: uploadError } = await supabase.storage
        .from(MANAGED_PROPERTY_DOCUMENTS_BUCKET)
        .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type || undefined,
            upsert: false,
        });

    if (uploadError) throwIfError(uploadError, "Failed to upload managed property document file");

    const { data, error } = await supabase
        .from("managed_property_documents")
        .update({
            file_name: file.name,
            storage_path: storagePath,
        })
        .eq("id", documentId)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to link uploaded file to document");

    if (previousStoragePath && previousStoragePath !== storagePath) {
        await supabase.storage
            .from(MANAGED_PROPERTY_DOCUMENTS_BUCKET)
            .remove([previousStoragePath]);
    }

    return data as ManagedPropertyDocument;
}

export async function createManagedPropertyDocumentSignedUrl(storagePath: string) {
    const supabase = createClient();

    const { data, error } = await supabase.storage
        .from(MANAGED_PROPERTY_DOCUMENTS_BUCKET)
        .createSignedUrl(storagePath, 60 * 10);

    if (error) throwIfError(error, "Failed to create document download link");

    return data.signedUrl;
}

export async function removeManagedPropertyDocumentFile({
    documentId,
    storagePath,
}: {
    documentId: string;
    storagePath: string;
}) {
    const supabase = createClient();

    const { error: removeError } = await supabase.storage
        .from(MANAGED_PROPERTY_DOCUMENTS_BUCKET)
        .remove([storagePath]);

    if (removeError) throwIfError(removeError, "Failed to remove managed property document file");

    const { data, error } = await supabase
        .from("managed_property_documents")
        .update({
            file_name: null,
            storage_path: null,
        })
        .eq("id", documentId)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to unlink document file");

    return data as ManagedPropertyDocument;
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

    let monthsResult = await supabase
        .from("managed_property_income_months")
        .select("*")
        .eq("managed_property_id", managedPropertyId)
        .eq("year", year)
        .order("month", { ascending: true });

    if (monthsResult.error) throwIfError(monthsResult.error, "Failed to load managed property income months");

    const existingMonths = (monthsResult.data ?? []) as ManagedPropertyIncomeMonth[];
    const existingMonthNumbers = new Set(existingMonths.map((month) => month.month));
    const missingMonths = Array.from({ length: 12 }, (_, index) => index + 1).filter((month) => !existingMonthNumbers.has(month));

    if (missingMonths.length > 0) {
        const { error: insertMonthsError } = await supabase
            .from("managed_property_income_months")
            .insert(
                missingMonths.map((month) => ({
                    managed_property_id: managedPropertyId,
                    year,
                    month,
                    rent_expected_eur: 0,
                    rent_paid_eur: 0,
                    rent_paid_date: null,
                    rent_status: "no_rent",
                    electricity_confirmed: false,
                    water_confirmed: false,
                    gas_confirmed: false,
                    building_fees_confirmed: false,
                    note: null,
                })),
            );

        if (insertMonthsError && !isDuplicateKeyError(insertMonthsError)) throwIfError(insertMonthsError, "Failed to create income months for selected year");

        monthsResult = await supabase
            .from("managed_property_income_months")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .eq("year", year)
            .order("month", { ascending: true });

        if (monthsResult.error) throwIfError(monthsResult.error, "Failed to reload managed property income months");
    }

    let taxReserveResult = await supabase
        .from("managed_property_tax_reserve")
        .select("*")
        .eq("managed_property_id", managedPropertyId)
        .eq("year", year)
        .maybeSingle();

    if (taxReserveResult.error) throwIfError(taxReserveResult.error, "Failed to load managed property tax reserve");

    if (!taxReserveResult.data) {
        const { error: insertTaxReserveError } = await supabase
            .from("managed_property_tax_reserve")
            .insert({
                managed_property_id: managedPropertyId,
                year,
                tax_rate_percent: 15,
                estimated_tax_eur: 0,
                due_date: null,
                paid: false,
                paid_date: null,
                note: null,
            });

        if (insertTaxReserveError && !isDuplicateKeyError(insertTaxReserveError)) throwIfError(insertTaxReserveError, "Failed to create tax reserve for selected year");

        taxReserveResult = await supabase
            .from("managed_property_tax_reserve")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .eq("year", year)
            .maybeSingle();

        if (taxReserveResult.error) throwIfError(taxReserveResult.error, "Failed to reload managed property tax reserve");
    }

    const ownerExpensesResult = await supabase
        .from("managed_property_income_owner_expenses")
        .select("*")
        .eq("managed_property_id", managedPropertyId)
        .order("expense_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (ownerExpensesResult.error) throwIfError(ownerExpensesResult.error, "Failed to load managed property owner expenses");

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

export type ManagedPropertyRealEstateProfile = {
    id: string;
    managed_property_id: string;
    owner_afm: string | null;
    tax_portal_username: string | null;
    tax_portal_password_ref: string | null;
    atak: string | null;
    pea_number: string | null;
    rental_contract_reference: string | null;
    address_en: string | null;
    address_local: string | null;
    acquisition_date: string | null;
    purchase_price_eur: number | null;
    credit_amount_eur: number | null;
    self_participation_eur: number | null;
    acquisition_notes: string | null;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRealEstateProfilePatch = Partial<
    Pick<
        ManagedPropertyRealEstateProfile,
        | "owner_afm"
        | "tax_portal_username"
        | "tax_portal_password_ref"
        | "atak"
        | "pea_number"
        | "rental_contract_reference"
        | "address_en"
        | "address_local"
        | "acquisition_date"
        | "purchase_price_eur"
        | "credit_amount_eur"
        | "self_participation_eur"
        | "acquisition_notes"
    >
>;

export type ManagedPropertyRealEstateCostCategory = "price" | "tax" | "broker" | "legal" | "notary" | "registry" | "cadastre" | "financing" | "other";

export type ManagedPropertyRealEstateCost = {
    id: string;
    managed_property_id: string;
    stable_key: string;
    label: string;
    local_label: string | null;
    category: ManagedPropertyRealEstateCostCategory;
    amount_eur: number;
    rate_percent: number | null;
    vat_rate_percent: number | null;
    vat_included: boolean;
    expense_id: string | null;
    note: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRealEstateCostInsert = Omit<ManagedPropertyRealEstateCost, "id" | "created_at" | "updated_at">;

export type ManagedPropertyRealEstateCostPatch = Partial<
    Pick<
        ManagedPropertyRealEstateCost,
        | "stable_key"
        | "label"
        | "local_label"
        | "category"
        | "amount_eur"
        | "rate_percent"
        | "vat_rate_percent"
        | "vat_included"
        | "expense_id"
        | "note"
        | "sort_order"
    >
>;

export type ManagedPropertyServiceType = "electricity" | "water" | "gas" | "internet_tv" | "building_fees" | "other";

export type ManagedPropertyServiceAccount = {
    id: string;
    managed_property_id: string;
    service_type: ManagedPropertyServiceType;
    provider_name: string | null;
    start_date: string | null;
    account_holder: string | null;
    account_number: string | null;
    meter_number: string | null;
    contract_number: string | null;
    customer_code: string | null;
    payment_code: string | null;
    delivery_point: string | null;
    plan_name: string | null;
    monthly_fee_eur: number | null;
    manager_name: string | null;
    manager_phone: string | null;
    manager_email: string | null;
    manager_bank_account: string | null;
    phone: string | null;
    website: string | null;
    note: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyServiceAccountInsert = Omit<ManagedPropertyServiceAccount, "id" | "created_at" | "updated_at">;
export type ManagedPropertyServiceAccountPatch = Partial<Omit<ManagedPropertyServiceAccountInsert, "managed_property_id" | "service_type">> & {
    service_type?: ManagedPropertyServiceType;
};

export type ManagedPropertyRealEstateContactType = "tenant" | "previous_owner" | "property_manager" | "other";

export type ManagedPropertyRealEstateContact = {
    id: string;
    managed_property_id: string;
    contact_type: ManagedPropertyRealEstateContactType;
    full_name: string;
    afm: string | null;
    phone: string | null;
    email: string | null;
    note: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export type ManagedPropertyRealEstateContactInsert = Omit<ManagedPropertyRealEstateContact, "id" | "created_at" | "updated_at">;
export type ManagedPropertyRealEstateContactPatch = Partial<Omit<ManagedPropertyRealEstateContactInsert, "managed_property_id">>;

export type ManagedPropertyRealEstateBundle = {
    profile: ManagedPropertyRealEstateProfile | null;
    costs: ManagedPropertyRealEstateCost[];
    serviceAccounts: ManagedPropertyServiceAccount[];
    contacts: ManagedPropertyRealEstateContact[];
};

export async function getManagedPropertyRealEstate(managedPropertyId: string) {
    const supabase = createClient();

    const [profileResult, costsResult, servicesResult, contactsResult] = await Promise.all([
        supabase
            .from("managed_property_real_estate_profiles")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .maybeSingle(),
        supabase
            .from("managed_property_real_estate_costs")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase
            .from("managed_property_service_accounts")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase
            .from("managed_property_real_estate_contacts")
            .select("*")
            .eq("managed_property_id", managedPropertyId)
            .order("contact_type", { ascending: true })
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
    ]);

    if (profileResult.error) throwIfError(profileResult.error, "Failed to load real estate profile");
    if (costsResult.error) throwIfError(costsResult.error, "Failed to load real estate costs");
    if (servicesResult.error) throwIfError(servicesResult.error, "Failed to load service accounts");
    if (contactsResult.error) throwIfError(contactsResult.error, "Failed to load real estate contacts");

    return {
        profile: (profileResult.data ?? null) as ManagedPropertyRealEstateProfile | null,
        costs: (costsResult.data ?? []) as ManagedPropertyRealEstateCost[],
        serviceAccounts: (servicesResult.data ?? []) as ManagedPropertyServiceAccount[],
        contacts: (contactsResult.data ?? []) as ManagedPropertyRealEstateContact[],
    } satisfies ManagedPropertyRealEstateBundle;
}

export async function upsertManagedPropertyRealEstateProfile(
    managedPropertyId: string,
    patch: ManagedPropertyRealEstateProfilePatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_real_estate_profiles")
        .upsert({ managed_property_id: managedPropertyId, ...patch }, { onConflict: "managed_property_id" })
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to save real estate profile");

    return data as ManagedPropertyRealEstateProfile;
}

export async function createManagedPropertyRealEstateCost(payload: ManagedPropertyRealEstateCostInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_real_estate_costs")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create real estate cost");

    return data as ManagedPropertyRealEstateCost;
}

export async function updateManagedPropertyRealEstateCost(
    id: string,
    patch: ManagedPropertyRealEstateCostPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_real_estate_costs")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update real estate cost");

    return data as ManagedPropertyRealEstateCost;
}

export async function deleteManagedPropertyRealEstateCost(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_real_estate_costs")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete real estate cost");
}

export async function createManagedPropertyServiceAccount(payload: ManagedPropertyServiceAccountInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_service_accounts")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create service account");

    return data as ManagedPropertyServiceAccount;
}

export async function updateManagedPropertyServiceAccount(
    id: string,
    patch: ManagedPropertyServiceAccountPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_service_accounts")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update service account");

    return data as ManagedPropertyServiceAccount;
}

export async function deleteManagedPropertyServiceAccount(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_service_accounts")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete service account");
}

export async function createManagedPropertyRealEstateContact(payload: ManagedPropertyRealEstateContactInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_real_estate_contacts")
        .insert(payload)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to create real estate contact");

    return data as ManagedPropertyRealEstateContact;
}

export async function updateManagedPropertyRealEstateContact(
    id: string,
    patch: ManagedPropertyRealEstateContactPatch,
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("managed_property_real_estate_contacts")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throwIfError(error, "Failed to update real estate contact");

    return data as ManagedPropertyRealEstateContact;
}

export async function deleteManagedPropertyRealEstateContact(id: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("managed_property_real_estate_contacts")
        .delete()
        .eq("id", id);

    if (error) throwIfError(error, "Failed to delete real estate contact");
}
