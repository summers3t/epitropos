"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function recreateCaseFromOrder(orderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/admin/orders/${orderId}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, offer_id, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    redirect("/admin/orders");
  }

  if (order.payment_status !== "paid") {
    redirect(
      `/admin/orders/${orderId}?caseError=${encodeURIComponent(
        "A replacement case can be created only for a paid order.",
      )}`,
    );
  }

  const { data: existingCase, error: existingCaseError } = await supabase
    .from("cases")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existingCaseError) {
    throw new Error(existingCaseError.message);
  }

  if (existingCase) {
    redirect(
      `/admin/orders/${orderId}?caseError=${encodeURIComponent(
        "This order already has a linked case.",
      )}`,
    );
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, screening_request_id")
    .eq("id", order.offer_id)
    .maybeSingle();

  if (offerError) {
    throw new Error(offerError.message);
  }

  if (!offer) {
    redirect(
      `/admin/orders/${orderId}?caseError=${encodeURIComponent(
        "Related offer not found for this order.",
      )}`,
    );
  }

  const { data: screening, error: screeningError } = offer.screening_request_id
    ? await supabase
        .from("screening_requests")
        .select("id, name")
        .eq("id", offer.screening_request_id)
        .maybeSingle()
    : { data: null, error: null as null | Error };

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  const caseTitle =
    screening?.name && screening.name.trim().length > 0
      ? `Case for ${screening.name.trim()}`
      : `Case for client ${order.user_id}`;

  const { data: insertedCase, error: insertCaseError } = await supabase
    .from("cases")
    .insert({
      client_id: order.user_id,
      order_id: order.id,
      screening_request_id: offer.screening_request_id,
      title: caseTitle,
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (insertCaseError) {
    throw new Error(insertCaseError.message);
  }

  if (!insertedCase) {
    throw new Error("Replacement case could not be created.");
  }

  redirect(
    `/admin/orders/${orderId}?caseNotice=${encodeURIComponent(
      "Replacement case created successfully.",
    )}`,
  );
}
