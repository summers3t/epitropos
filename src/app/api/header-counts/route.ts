import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { screening: 0, orders: 0, cases: 0 },
            { status: 200 }
        );
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
        );
    }

    if (!profile || profile.role !== "admin") {
        return NextResponse.json(
            { screening: 0, orders: 0, cases: 0 },
            { status: 200 }
        );
    }

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
        return NextResponse.json(
            { error: screeningCountError.message },
            { status: 500 }
        );
    }

    if (ordersCountError) {
        return NextResponse.json(
            { error: ordersCountError.message },
            { status: 500 }
        );
    }

    if (casesCountError) {
        return NextResponse.json(
            { error: casesCountError.message },
            { status: 500 }
        );
    }

    return NextResponse.json(
        {
            screening: screeningCount ?? 0,
            orders: ordersCount ?? 0,
            cases: casesCount ?? 0,
        },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }
    );
}