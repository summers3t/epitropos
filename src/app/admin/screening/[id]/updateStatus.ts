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

    const allowedStatuses = ["new", "offer_sent", "accepted", "rejected"];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid screening status.");
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

    const { data: request, error: requestError } = await supabase
        .from("screening_requests")
        .select("id, status")
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
        throw new Error(requestError.message);
    }

    if (!request) {
        redirect("/admin/screening");
    }

    const allowedTransitions: Record<string, string[]> = {
        new: ["offer_sent"],
        offer_sent: ["accepted", "rejected"],
        accepted: [],
        rejected: [],
    };

    if (!allowedTransitions[request.status]?.includes(status)) {
        throw new Error(
            `Invalid screening transition: ${request.status} → ${status}`
        );
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