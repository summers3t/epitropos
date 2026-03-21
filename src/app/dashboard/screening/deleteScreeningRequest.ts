"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteOwnScreeningRequest(requestId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/dashboard/screening");
    }

    const { data: request, error: requestError } = await supabase
        .from("screening_requests")
        .select("id, user_id, status")
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
        throw new Error(requestError.message);
    }

    if (!request || request.user_id !== user.id) {
        redirect("/dashboard/screening");
    }

    const deletableStatuses = ["new"];

    if (!deletableStatuses.includes(request.status ?? "")) {
        throw new Error("This screening request can no longer be deleted.");
    }

    const { data: blockingOffer, error: blockingOfferError } = await supabase
        .from("offers")
        .select("id, status")
        .eq("screening_request_id", request.id)
        .in("status", ["sent", "accepted"])
        .maybeSingle();

    if (blockingOfferError) {
        throw new Error(blockingOfferError.message);
    }

    if (blockingOffer) {
        throw new Error("This screening request already has a commercial chain and cannot be deleted.");
    }

    const { data: blockingCase, error: blockingCaseError } = await supabase
        .from("cases")
        .select("id")
        .eq("screening_request_id", request.id)
        .maybeSingle();

    if (blockingCaseError) {
        throw new Error(blockingCaseError.message);
    }

    if (blockingCase) {
        throw new Error("This screening request already has a case and cannot be deleted.");
    }

    const { error: deleteError } = await supabase
        .from("screening_requests")
        .delete()
        .eq("id", request.id)
        .eq("user_id", user.id);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    redirect("/dashboard/screening");
}