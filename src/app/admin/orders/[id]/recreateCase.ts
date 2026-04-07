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
    .select(
      "id, user_id, offer_id, payment_status, deleted_case_snapshot, deleted_case_deleted_at",
    )
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

  const deletedCaseSnapshot =
    order.deleted_case_snapshot &&
    typeof order.deleted_case_snapshot === "object"
      ? order.deleted_case_snapshot
      : null;

  const fallbackCaseTitle =
    screening?.name && screening.name.trim().length > 0
      ? `Case for ${screening.name.trim()}`
      : `Case for client ${order.user_id}`;

  const restoredTitle =
    typeof deletedCaseSnapshot?.title === "string" &&
    deletedCaseSnapshot.title.trim().length > 0
      ? deletedCaseSnapshot.title.trim()
      : fallbackCaseTitle;

  const restoredStatus =
    deletedCaseSnapshot?.status === "active" ||
    deletedCaseSnapshot?.status === "analysis" ||
    deletedCaseSnapshot?.status === "delivered" ||
    deletedCaseSnapshot?.status === "closed"
      ? deletedCaseSnapshot.status
      : "active";

  const restoredDecisionStatus =
    deletedCaseSnapshot?.decision_status === "pending" ||
    deletedCaseSnapshot?.decision_status === "watchlist" ||
    deletedCaseSnapshot?.decision_status === "recommended" ||
    deletedCaseSnapshot?.decision_status === "rejected_all"
      ? deletedCaseSnapshot.decision_status
      : null;

  const restoredDecisionSummary =
    typeof deletedCaseSnapshot?.decision_summary === "string" &&
    deletedCaseSnapshot.decision_summary.trim().length > 0
      ? deletedCaseSnapshot.decision_summary
      : null;

  const restoredDecisionUpdatedAt =
    typeof deletedCaseSnapshot?.decision_updated_at === "string" &&
    deletedCaseSnapshot.decision_updated_at.trim().length > 0
      ? deletedCaseSnapshot.decision_updated_at
      : null;

  const { data: insertedCase, error: insertCaseError } = await supabase
    .from("cases")
    .insert({
      client_id: order.user_id,
      order_id: order.id,
      screening_request_id: offer.screening_request_id,
      title: restoredTitle,
      status: restoredStatus,
      decision_status: restoredDecisionStatus,
      decision_summary: restoredDecisionSummary,
      decision_updated_at: restoredDecisionUpdatedAt,
      recommended_property_id: null,
    })
    .select("id")
    .maybeSingle();

  if (insertCaseError) {
    throw new Error(insertCaseError.message);
  }

  if (!insertedCase) {
    throw new Error("Replacement case could not be created.");
  }

  const { error: clearSnapshotError } = await supabase
    .from("orders")
    .update({
      deleted_case_snapshot: null,
      deleted_case_deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (clearSnapshotError) {
    throw new Error(clearSnapshotError.message);
  }

  redirect(
    `/admin/orders/${orderId}?caseNotice=${encodeURIComponent(
      deletedCaseSnapshot
        ? "Replacement case restored with its last saved state."
        : "Replacement case created successfully.",
    )}`,
  );
}
