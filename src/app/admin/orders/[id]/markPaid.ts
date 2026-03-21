"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markOrderPaid(orderId: string, formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const paymentReference = String(formData.get("payment_reference") ?? "").trim();

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
        throw new Error(orderError.message);
    }

    if (!order) {
        redirect("/admin/orders");
    }

    if (order.payment_status !== "pending") {
        redirect(`/admin/orders/${orderId}`);
    }

    const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
            payment_status: "paid",
            payment_provider: "manual_admin_confirmation",
            payment_reference: paymentReference || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("payment_status", "pending")
        .select("id, user_id, offer_id")
        .maybeSingle();

    if (updateError) {
        throw new Error(updateError.message);
    }

    if (!updatedOrder) {
        throw new Error("Order could not be marked as paid.");
    }

    const { data: existingCase, error: existingCaseError } = await supabase
        .from("cases")
        .select("id")
        .eq("order_id", updatedOrder.id)
        .maybeSingle();

    if (existingCaseError) {
        throw new Error(existingCaseError.message);
    }

    if (!existingCase) {
        const { data: offer, error: offerError } = await supabase
            .from("offers")
            .select("id, screening_request_id")
            .eq("id", updatedOrder.offer_id)
            .maybeSingle();

        if (offerError) {
            throw new Error(offerError.message);
        }

        if (!offer) {
            throw new Error("Related offer not found for paid order.");
        }

        const { data: screening, error: screeningError } = await supabase
            .from("screening_requests")
            .select("id, name")
            .eq("id", offer.screening_request_id)
            .maybeSingle();

        if (screeningError) {
            throw new Error(screeningError.message);
        }

        const caseTitle =
            screening?.name && screening.name.trim().length > 0
                ? `Case for ${screening.name}`
                : "Client Case";

        const { error: createCaseError } = await supabase.from("cases").insert({
            client_id: updatedOrder.user_id,
            order_id: updatedOrder.id,
            screening_request_id: offer.screening_request_id,
            title: caseTitle,
            status: "active",
            updated_at: new Date().toISOString(),
        });

        if (createCaseError) {
            throw new Error(createCaseError.message);
        }
    }

    redirect(`/admin/orders/${orderId}`);
}