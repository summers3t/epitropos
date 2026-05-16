import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import {
  formatRecommendedPlan,
  formatTriageResult,
  getDecisionPresentation,
  getDecisionToneClasses,
} from "@/lib/intake/clientDecision";
import { deleteOwnScreeningRequest } from "../../screening/deleteScreeningRequest";

function formatCaseStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    active: "Active",
    analysis: "Analysis",
    delivered: "Delivered",
    closed: "Closed",
  };

  return labels[status] ?? status;
}

function formatAnalysisStageLabel(input: {
  screeningStatus: string | null | undefined;
  offerStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasPublishedReport: boolean;
}) {
  const {
    screeningStatus,
    offerStatus,
    paymentStatus,
    caseStatus,
    hasPublishedReport,
  } = input;

  if (screeningStatus === "rejected") return "Declined";
  if (caseStatus === "closed") return "Completed";
  if (hasPublishedReport || caseStatus === "delivered") return "Report Ready";
  if (caseStatus === "analysis") return "Analysis In Progress";
  if (caseStatus === "active") return "Analysis Started";
  if (paymentStatus === "pending") return "Awaiting Payment";
  if (offerStatus === "sent") return "Offer Ready";
  if (screeningStatus === "accepted") return "Accepted";
  return "Request Received";
}

function getProgressSteps({
  screeningStatus,
  offerStatus,
  paymentStatus,
  caseStatus,
  hasPublishedReport,
}: {
  screeningStatus: string | null | undefined;
  offerStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasPublishedReport: boolean;
}) {
  const steps = [
    { key: "request", label: "Request", state: "upcoming" as "done" | "current" | "upcoming" },
    { key: "review", label: "Review", state: "upcoming" as "done" | "current" | "upcoming" },
    { key: "offer", label: "Offer", state: "upcoming" as "done" | "current" | "upcoming" },
    { key: "payment", label: "Payment", state: "upcoming" as "done" | "current" | "upcoming" },
    { key: "analysis", label: "Analysis", state: "upcoming" as "done" | "current" | "upcoming" },
    { key: "report", label: "Report", state: "upcoming" as "done" | "current" | "upcoming" },
  ];

  steps[0].state = "done";

  if (screeningStatus === "new") {
    steps[1].state = "current";
    return steps;
  }

  if (screeningStatus === "rejected") {
    steps[1].state = "current";
    return steps;
  }

  steps[1].state = "done";

  if (screeningStatus === "accepted" && !offerStatus) {
    steps[2].state = "current";
    return steps;
  }

  if (offerStatus === "sent" || offerStatus === "accepted") {
    steps[2].state = "done";
  }

  if (paymentStatus === "pending") {
    steps[3].state = "current";
    return steps;
  }

  if (paymentStatus === "paid") {
    steps[3].state = "done";
  }

  if (caseStatus === "active" || caseStatus === "analysis") {
    steps[4].state = "current";
  }

  if (caseStatus === "analysis") {
    steps[4].state = "current";
  }

  if (caseStatus === "delivered" || caseStatus === "closed") {
    steps[4].state = "done";
    steps[5].state = "current";
  }

  if (hasPublishedReport) {
    steps[5].state = caseStatus === "closed" ? "done" : "current";
  }

  return steps;
}

function getGuidanceText({
  screeningStatus,
  offerStatus,
  paymentStatus,
  caseStatus,
  hasPublishedReport,
}: {
  screeningStatus: string | null | undefined;
  offerStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasPublishedReport: boolean;
}) {
  if (screeningStatus === "rejected") {
    return {
      current: "The request was reviewed but not accepted for further work.",
      attention: "No action is required at this stage.",
      next: "A new request may be submitted later if circumstances change.",
    };
  }

  if (caseStatus === "closed") {
    return {
      current: "The analysis has been completed.",
      attention: "No immediate action is required.",
      next: "All final outputs remain available for review.",
    };
  }

  if (hasPublishedReport || caseStatus === "delivered") {
    return {
      current: "The final report is available.",
      attention: "Open and review the delivered report.",
      next: "The final conclusion and written output are now available in this analysis.",
    };
  }

  if (caseStatus === "analysis") {
    return {
      current: "This analysis is currently in the evaluation phase.",
      attention: "No action is required at this stage.",
      next: "The final report will be prepared once the review is complete.",
    };
  }

  if (caseStatus === "active") {
    return {
      current: "Preparation is complete and the evaluation phase is beginning.",
      attention: "No action is required at this stage.",
      next: "The next update will appear once the active review advances.",
    };
  }

  if (paymentStatus === "pending") {
    return {
      current: "Commercial acceptance is complete, but work has not started yet.",
      attention: "Payment confirmation is required before the analysis can begin.",
      next: "Once payment is confirmed, the analysis will move into the active phase.",
    };
  }

  if (offerStatus === "sent") {
    return {
      current: "The request has passed review and the offer is ready.",
      attention: "Review the offer.",
      next: "After acceptance and payment confirmation, the analysis will begin.",
    };
  }

  if (screeningStatus === "accepted") {
    return {
      current: "The request has been accepted and the next commercial step is being prepared.",
      attention: "No action is required at this stage.",
      next: "The next update will appear once the offer is prepared.",
    };
  }

  return {
    current: "The request has been received and is currently under review.",
    attention: "No action is required at this stage.",
    next: "The next update will appear after the review is completed.",
  };
}

function renderValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return "—";
}

const readinessOrder = [
  ["whyGreece", "Why Greece"],
  ["stage", "Current stage"],
  ["propertyUse", "Property use"],
  ["budgetBand", "Budget band"],
  ["financing", "Financing"],
  ["identifiedProperty", "Property identified"],
  ["seriousness", "Urgency"],
  ["mainWorry", "Main worry"],
] as const;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardAnalysisDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/analyses/${id}`);
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: screening, error: screeningError } = await supabase
    .from("screening_requests")
    .select(
      "id, user_id, name, status, created_at, notes, triage_result, recommended_plan, primary_blocker, readiness_answers, screening_answers, plan_interest, budget_range, goal",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  if (!screening) {
    notFound();
  }

  const { data: relatedOffer, error: relatedOfferError } = await supabase
    .from("offers")
    .select("id, plan_type, price_amount, currency, status, created_at")
    .eq("screening_request_id", screening.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (relatedOfferError) {
    throw new Error(relatedOfferError.message);
  }

  const { data: relatedOrder, error: relatedOrderError } = relatedOffer
    ? await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("offer_id", relatedOffer.id)
        .maybeSingle()
    : { data: null, error: null as null | Error };

  if (relatedOrderError) {
    throw new Error(relatedOrderError.message);
  }

  const { data: relatedCase, error: relatedCaseError } =
    relatedOrder && relatedOrder.payment_status === "paid"
      ? await supabase
          .from("cases")
          .select(
            "id, title, status, decision_status, decision_summary, recommended_property_id",
          )
          .eq("order_id", relatedOrder.id)
          .eq("client_id", user.id)
          .maybeSingle()
      : { data: null, error: null as null | Error };

  if (relatedCaseError) {
    throw new Error(relatedCaseError.message);
  }

  const { data: caseProperties, error: casePropertiesError } = relatedCase
    ? await supabase
        .from("case_properties")
        .select("id, title, address")
        .eq("case_id", relatedCase.id)
        .order("sort_order", { ascending: true })
    : { data: [], error: null as null | Error };

  if (casePropertiesError) {
    throw new Error(casePropertiesError.message);
  }

  const { data: reports, error: reportsError } = relatedCase
    ? await supabase
        .from("reports")
        .select("id, title, summary, published, published_at, storage_path")
        .eq("case_id", relatedCase.id)
        .eq("published", true)
        .order("published_at", { ascending: false })
    : { data: [], error: null as null | Error };

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  const recommendedProperty =
    relatedCase?.recommended_property_id && caseProperties
      ? caseProperties.find(
          (item) => item.id === relatedCase.recommended_property_id,
        ) ?? null
      : null;

  const hasPublishedReport = (reports?.length ?? 0) > 0;

  const decision = getDecisionPresentation({
    triageResult: screening.triage_result,
    recommendedPlan: screening.recommended_plan,
  });

  const toneClasses = getDecisionToneClasses(decision.tone);

  const guidance = getGuidanceText({
    screeningStatus: screening.status,
    offerStatus: relatedOffer?.status,
    paymentStatus: relatedOrder?.payment_status,
    caseStatus: relatedCase?.status,
    hasPublishedReport,
  });

  const readinessAnswers =
    screening.readiness_answers &&
    typeof screening.readiness_answers === "object" &&
    !Array.isArray(screening.readiness_answers)
      ? (screening.readiness_answers as Record<string, unknown>)
      : {};

  const screeningAnswers =
    screening.screening_answers &&
    typeof screening.screening_answers === "object" &&
    !Array.isArray(screening.screening_answers)
      ? (screening.screening_answers as Record<string, unknown>)
      : {};

  const canDelete = screening.status === "new";

  const displayPlan =
    relatedOffer?.plan_type ?? screening.recommended_plan ?? screening.plan_interest;

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title={screening.name || "Analysis"}
      description="A single view of the current stage, the next expected step, and the final outputs for this engagement."
      counts={counts}
    >
      <section className="space-y-6">
        <div>
          <Link
            href="/dashboard/analyses"
            className="inline-flex text-[11px] uppercase tracking-[0.2em] text-[#9a8660] transition hover:text-[#0f1c2e]"
          >
            ← Back to My Analyses
          </Link>
        </div>

        <article className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[#dcc79e] bg-[#fff8ea] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8b6d35]">
                  {formatRecommendedPlan(displayPlan)}
                </span>
                <span className="inline-flex rounded-full border border-[#eadfca] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#756b59]">
                  {formatAnalysisStageLabel({
                    screeningStatus: screening.status,
                    offerStatus: relatedOffer?.status,
                    paymentStatus: relatedOrder?.payment_status,
                    caseStatus: relatedCase?.status,
                    hasPublishedReport,
                  })}
                </span>
              </div>

              <div>
                <p className="text-[18px] font-semibold text-[#0f1c2e]">
                  {screening.name || "Analysis"}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[#5f6675]">
                  {guidance.current}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 px-4 py-3 text-[12px] text-[#6b7280]">
              <div>
                <span className="text-[#9a8660]">Request:</span>{" "}
                {formatTriageResult(screening.triage_result)}
              </div>
              <div className="mt-1">
                <span className="text-[#9a8660]">Screening status:</span>{" "}
                {renderValue(screening.status)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-6">
            {getProgressSteps({
              screeningStatus: screening.status,
              offerStatus: relatedOffer?.status,
              paymentStatus: relatedOrder?.payment_status,
              caseStatus: relatedCase?.status,
              hasPublishedReport,
            }).map((step) => (
              <div
                key={step.key}
                className={[
                  "rounded-2xl border px-3 py-3",
                  step.state === "done"
                    ? "border-[#cfe0c8] bg-[#edf6e8]"
                    : step.state === "current"
                      ? "border-[#dcc79e] bg-[#fff8ea] ring-1 ring-[#dcc79e]/70"
                      : "border-[#eadfca] bg-white/70",
                ].join(" ")}
              >
                <div
                  className={[
                    "text-[10px] uppercase tracking-[0.14em]",
                    step.state === "done"
                      ? "text-[#57714e]"
                      : step.state === "current"
                        ? "text-[#9a6a16]"
                        : "text-[#9a8660]",
                  ].join(" ")}
                >
                  {step.state === "done"
                    ? "Completed"
                    : step.state === "current"
                      ? "Current"
                      : "Upcoming"}
                </div>
                <div
                  className={[
                    "mt-1 text-xs font-medium leading-5",
                    step.state === "current"
                      ? "text-[#0f1c2e]"
                      : "text-[#4b5563]",
                  ].join(" ")}
                >
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article
          className={[
            "rounded-[24px] border p-6 shadow-[0_18px_48px_rgba(148,119,66,0.08)] backdrop-blur",
            toneClasses.panel,
          ].join(" ")}
        >
          <div className="space-y-3">
            <div
              className={[
                "inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
                toneClasses.badge,
              ].join(" ")}
            >
              {decision.badge}
            </div>

            <div>
              <h2
                className="text-[30px] leading-tight text-[#0f1c2e]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {decision.title}
              </h2>
              <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#5f6675]">
                {decision.summary}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                What requires attention now
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                {screening.primary_blocker || guidance.attention}
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                What comes next
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                <p className="font-medium text-[#0f1c2e]">
                  {decision.nextStepTitle}
                </p>
                <p className="mt-2">{decision.nextStepBody || guidance.next}</p>
              </div>
            </div>
          </div>

          {decision.ctaLabel && decision.ctaHref ? (
            <div className="mt-5">
              <Link
                href={decision.ctaHref}
                className="inline-flex items-center rounded-xl border border-[#b8935c] bg-[#fff8ea] px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-[#9a6a16] transition hover:bg-[#fff3db]"
              >
                {decision.ctaLabel}
              </Link>
            </div>
          ) : null}
        </article>

        {relatedCase ? (
          <article className="rounded-[24px] border border-[#eadfca] bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
            <h3
              className="text-[24px] leading-tight text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Analysis Outcome
            </h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                  Case status
                </div>
                <div className="mt-1 text-[13px] text-[#6b7280]">
                  {formatCaseStatusLabel(relatedCase.status)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                  Decision status
                </div>
                <div className="mt-1 text-[13px] text-[#6b7280]">
                  {renderValue(relatedCase.decision_status)}
                </div>
              </div>

              {recommendedProperty ? (
                <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4 md:col-span-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                    Recommended property
                  </div>
                  <div className="mt-1 text-[13px] text-[#6b7280]">
                    {recommendedProperty.title || recommendedProperty.address || "—"}
                  </div>
                </div>
              ) : null}

              {relatedCase.decision_summary ? (
                <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4 md:col-span-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                    Decision summary
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-[13px] text-[#6b7280]">
                    {relatedCase.decision_summary}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="rounded-[24px] border border-[#eadfca] bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <h3
            className="text-[24px] leading-tight text-[#0f1c2e]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Submitted Frame
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {readinessOrder.map(([key, label]) => (
              <div
                key={key}
                className="rounded-2xl border border-[#eadfca] bg-white/70 p-4"
              >
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                  {label}
                </dt>
                <dd className="mt-1 text-[13px] text-[#6b7280]">
                  {renderValue(readinessAnswers[key])}
                </dd>
              </div>
            ))}

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Client objective
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screening.goal)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Budget
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screening.budget_range)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Situation
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screeningAnswers.situation)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Location
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screeningAnswers.locationText)}
              </dd>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#eadfca] bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
              Additional context
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[13px] text-[#6b7280]">
              {renderValue(screeningAnswers.additionalContext || screening.notes)}
            </div>
          </div>

          {reports && reports.length > 0 ? (
            <div className="mt-5 space-y-4">
              <h4 className="text-[16px] font-semibold text-[#0f1c2e]">
                Delivered Reports
              </h4>

              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-[#eadfca] bg-white/70 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-[#0f1c2e]">
                        {report.title}
                      </p>
                      <p className="text-[13px] text-[#6b7280]">
                        {renderValue(report.summary)}
                      </p>
                    </div>

                    {report.storage_path ? (
                      <a
                        href={`/api/reports/${report.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                      >
                        Open Report
                      </a>
                    ) : (
                      <span className="rounded-xl border border-[#dcc79e] bg-[#fff8ea] px-4 py-2 text-xs text-[#9a6a16]">
                        Report file unavailable
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link
              href="/dashboard/analyses"
              className="rounded-xl border border-[#dcc79e]/70 bg-white/70 px-4 py-2 text-xs text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
            >
              Back to Analyses
            </Link>

            {decision.ctaLabel && decision.ctaHref ? (
              <Link
                href={decision.ctaHref}
                className="rounded-xl border border-[#b8935c] bg-[#fff8ea] px-4 py-2 text-xs text-[#9a6a16] transition hover:bg-[#fff3db]"
              >
                {decision.ctaLabel}
              </Link>
            ) : null}

            {canDelete ? (
              <form action={deleteOwnScreeningRequest.bind(null, screening.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Delete this request? This cannot be undone."
                  className="rounded-xl border border-red-400/30 bg-white/70 px-4 py-2 text-xs text-red-500 transition hover:bg-red-50"
                >
                  Delete Request
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        </article>
      </section>
    </ClientPortalShell>
  );
}