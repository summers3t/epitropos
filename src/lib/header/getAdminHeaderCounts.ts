import { SupabaseClient } from "@supabase/supabase-js";

export type AdminHeaderCounts = {
    screening: number;
    orders: number;
    cases: number;
};

export async function getAdminHeaderCounts(
    supabase: SupabaseClient
): Promise<AdminHeaderCounts> {
    const [
        { count: screeningCount, error: screeningCountError },
        { count: ordersCount, error: ordersCountError },
        { count: casesCount, error: casesCountError },
    ] = await Promise.all([
        supabase
            .from("screening_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "new"),
        supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("payment_status", "pending"),
        supabase
            .from("cases")
            .select("*", { count: "exact", head: true })
            .in("status", ["active", "analysis"]),
    ]);

    if (screeningCountError) {
        throw new Error(screeningCountError.message);
    }

    if (ordersCountError) {
        throw new Error(ordersCountError.message);
    }

    if (casesCountError) {
        throw new Error(casesCountError.message);
    }

    return {
        screening: screeningCount ?? 0,
        orders: ordersCount ?? 0,
        cases: casesCount ?? 0,
    };
}