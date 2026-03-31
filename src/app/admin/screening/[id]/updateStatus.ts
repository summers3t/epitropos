"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function buildAdminScreeningRedirect(
  requestId: string,
  params?: Record<string, string>,
) {
  const search = new URLSearchParams(params);
  const query = search.toString();

  return query
    ? `/admin/screening/${requestId}?${query}`
    : `/admin/screening/${requestId}`;
}

export async function updateScreeningStatus(
  requestId: string,
  formData: FormData,
) {
  const status = String(formData.get("status") ?? "").trim();

  if (!status) {
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: "Select a valid next status.",
      }),
    );
  }

  const allowedStatuses = ["new", "accepted", "rejected", "offer_sent"];

  if (!allowedStatuses.includes(status)) {
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: "Invalid screening status.",
      }),
    );
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
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: requestError.message,
      }),
    );
  }

  if (!request) {
    redirect("/admin/screening");
  }

  const allowedTransitions: Record<string, string[]> = {
    new: ["accepted", "rejected"],
    accepted: [],
    rejected: ["new"],
    offer_sent: [],
  };

  if (!allowedTransitions[request.status]?.includes(status)) {
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: `Invalid screening transition: ${request.status} → ${status}`,
      }),
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
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: error.message,
      }),
    );
  }

  redirect(
    buildAdminScreeningRedirect(requestId, {
      status_success: `Screening status updated to ${status}.`,
    }),
  );
}
