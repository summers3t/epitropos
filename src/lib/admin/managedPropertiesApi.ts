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
