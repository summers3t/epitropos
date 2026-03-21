"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AcceptOfferRpcResult = {
    offer_id: string;
    order_id: string;
    offer_status: string;
    payment_status: string;
};

export async function acceptOffer(offerId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
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
        redirect("/dashboard");
    }

    const { data: screening, error: screeningError } = await supabase
        .from("screening_requests")
        .select("id, user_id")
        .eq("id", offer.screening_request_id)
        .maybeSingle();

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    if (!screening || screening.user_id !== user.id) {
        redirect("/dashboard");
    }

    if (offer.status !== "sent") {
        redirect(`/dashboard/offers/${offerId}`);
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "accept_offer_and_create_order",
        {
            p_offer_id: offerId,
        }
    );

    if (rpcError) {
        throw new Error(rpcError.message);
    }

    const result = rpcResult as AcceptOfferRpcResult[] | AcceptOfferRpcResult | null;
    const resolvedResult = Array.isArray(result) ? result[0] : result;

    if (!resolvedResult?.offer_id || !resolvedResult?.order_id) {
        throw new Error("Offer acceptance did not complete correctly.");
    }

    redirect(`/dashboard/offers/${offerId}`);
}