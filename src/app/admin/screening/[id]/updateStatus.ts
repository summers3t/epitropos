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

const ALLOWED_TRIAGE_RESULTS = [
  "reject",
  "not_ready",
  "foundation_fit",
  "evaluation_fit",
  "guidance_fit",
] as const;

const ALLOWED_RECOMMENDED_PLANS = [
  "foundation",
  "evaluation",
  "guidance",
] as const;

function isAllowedTriage(value: string) {
  return ALLOWED_TRIAGE_RESULTS.includes(
    value as (typeof ALLOWED_TRIAGE_RESULTS)[number],
  );
}

function isAllowedRecommendedPlan(value: string) {
  return ALLOWED_RECOMMENDED_PLANS.includes(
    value as (typeof ALLOWED_RECOMMENDED_PLANS)[number],
  );
}

export async function reviewScreeningRequest(
  requestId: string,
  formData: FormData,
) {
  const triageResult = String(formData.get("triage_result") ?? "").trim();
  const recommendedPlan = String(formData.get("recommended_plan") ?? "").trim();
  const primaryBlocker =
    String(formData.get("primary_blocker") ?? "").trim() || null;

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

  if (triageResult && !isAllowedTriage(triageResult)) {
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: "Invalid triage result.",
      }),
    );
  }

  if (recommendedPlan && !isAllowedRecommendedPlan(recommendedPlan)) {
    redirect(
      buildAdminScreeningRedirect(requestId, {
        status_error: "Invalid recommended plan.",
      }),
    );
  }

  let nextStatus = request.status;

  if (request.status !== "offer_sent") {
    if (triageResult === "reject") {
      nextStatus = "rejected";
    } else if (
      triageResult === "foundation_fit" ||
      triageResult === "evaluation_fit" ||
      triageResult === "guidance_fit"
    ) {
      nextStatus = "accepted";
    } else if (triageResult === "not_ready") {
      nextStatus = "new";
    }
  }

  const { error } = await supabase
    .from("screening_requests")
    .update({
      triage_result: triageResult || null,
      recommended_plan: recommendedPlan || null,
      primary_blocker: primaryBlocker,
      status: nextStatus,
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
      status_success: "Screening review updated.",
    }),
  );
}