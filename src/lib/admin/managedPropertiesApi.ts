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
