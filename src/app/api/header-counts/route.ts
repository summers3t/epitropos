import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminHeaderCounts } from "@/lib/header/getAdminHeaderCounts";

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

    const counts = await getAdminHeaderCounts(supabase);

    return NextResponse.json(counts, {
        status: 200,
        headers: {
            "Cache-Control": "no-store, max-age=0",
        },
    });
}