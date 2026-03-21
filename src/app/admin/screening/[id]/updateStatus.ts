"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateScreeningStatus(
    requestId: string,
    formData: FormData
) {
    const status = String(formData.get("status") ?? "").trim();

    if (!status) {
        redirect(`/admin/screening/${requestId}`);
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { error } = await supabase
        .from("screening_requests")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        throw new Error(error.message);
    }

    redirect(`/admin/screening/${requestId}`);
}