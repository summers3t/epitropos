"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendOffer(offerId: string) {
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

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select("id, screening_request_id, status")
        .eq("id", offerId)
        .maybeSingle();

    if (offerError) {
        throw new Error(offerError.message);
    }

    if (!offer) {
        redirect("/admin/screening");
    }

    if (offer.status !== "draft") {
        redirect(`/admin/offers/${offer.id}`);
    }

    const { data: screening, error: screeningError } = await supabase
        .from("screening_requests")
        .select("id, status")
        .eq("id", offer.screening_request_id)
        .maybeSingle();

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    if (!screening) {
        redirect("/admin/screening");
    }

    if (screening.status !== "accepted") {
        throw new Error("Only accepted screening requests can send an offer.");
    }

    const { error: updateOfferError } = await supabase
        .from("offers")
        .update({
            status: "sent",
            updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

    if (updateOfferError) {
        throw new Error(updateOfferError.message);
    }

    const { error: updateScreeningError } = await supabase
        .from("screening_requests")
        .update({
            status: "offer_sent",
            updated_at: new Date().toISOString(),
        })
        .eq("id", offer.screening_request_id);

    if (updateScreeningError) {
        throw new Error(updateScreeningError.message);
    }

    redirect(`/admin/offers/${offer.id}`);
}