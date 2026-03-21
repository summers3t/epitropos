"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOfferPlanType } from "@/lib/config/pricing";

export async function createDraftOffer(
    screeningId: string,
    formData: FormData
) {
    const planType = String(formData.get("plan_type") ?? "").trim();
    const priceRaw = String(formData.get("price_amount") ?? "").trim();
    const priceAmount = Number(priceRaw);

    if (!isOfferPlanType(planType)) {
        throw new Error("A valid plan type is required.");
    }

    if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
        throw new Error("A valid price amount is required.");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/offers/new?screening=${screeningId}`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: screening, error: screeningError } = await supabase
        .from("screening_requests")
        .select("id, status")
        .eq("id", screeningId)
        .maybeSingle();

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    if (!screening || screening.status !== "accepted") {
        redirect(`/admin/screening/${screeningId}`);
    }

    const { data: sentOffer, error: sentOfferError } = await supabase
        .from("offers")
        .select("id")
        .eq("screening_request_id", screeningId)
        .eq("status", "sent")
        .maybeSingle();

    if (sentOfferError) {
        throw new Error(sentOfferError.message);
    }

    if (sentOffer) {
        redirect(`/admin/screening/${screeningId}`);
    }

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .insert({
            screening_request_id: screeningId,
            plan_type: planType,
            price_amount: priceAmount,
            currency: "EUR",
            status: "draft",
        })
        .select("id")
        .single();

    if (offerError) {
        throw new Error(offerError.message);
    }

    redirect(`/admin/offers/${offer.id}`);
}