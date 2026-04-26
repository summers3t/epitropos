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
import { deleteOwnScreeningRequest } from "../deleteScreeningRequest";

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    new: "Submitted",
    accepted: "Accepted",
    rejected: "Rejected",
    offer_sent: "Offer sent",
  };

  return labels[status] ?? status;
}

function getStatusHelp(status: string | null | undefined) {
  switch (status) {
    case "new":
      return "Your screening request has been submitted and is waiting for review.";
    case "accepted":
      return "Your screening has been accepted. The next step is the commercial offer.";
    case "offer_sent":
      return "Your screening has passed review and an offer has already been issued.";
    case "rejected":
      return "Your screening was reviewed but was not accepted for further engagement.";
    default:
      return "Your screening request is being processed.";
  }
}

function getScreeningProgressSteps({
  screeningStatus,
  paymentPending,
  paymentPaid,
  caseStatus,
}: {
  screeningStatus: string | null | undefined;
  paymentPending: boolean;
  paymentPaid: boolean;
  caseStatus: string | null | undefined;
}) {
  const base = [
    {
      key: "submitted",
      label: "Submitted",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "review",
      label: "Review",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "offer",
      label: "Offer",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "payment",
      label: "Payment",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "analysis",
      label: "Analysis",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "delivery",
      label: "Delivery",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
  ];

  if (screeningStatus === "rejected") {
    base[0].state = "done";
    base[1].state = "current";
    return base;
  }

  base[0].state = "done";

  if (screeningStatus === "new") {
    base[1].state = "current";
    return base;
  }

  base[1].state = "done";

  if (screeningStatus === "accepted") {
    base[2].state = "current";
    return base;
  }

  if (screeningStatus === "offer_sent") {
    base[2].state = "done";

    if (paymentPending) {
      base[3].state = "current";
      return base;
    }

    if (paymentPaid) {
      base[3].state = "done";

      if (caseStatus === "active" || caseStatus === "analysis") {
        base[4].state = "current";
        return base;
      }

      if (caseStatus === "delivered" || caseStatus === "closed") {
        base[4].state = "done";
        base[5].state = "current";
        return base;
      }

      base[4].state = "current";
      return base;
    }

    return base;
  }

  base[1].state = "current";
  return base;
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

export default async function DashboardScreeningDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/screening/${id}`);
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: request, error } = await supabase
    .from("screening_requests")
    .select(
      "id, user_id, name, status, created_at, notes, triage_result, recommended_plan, primary_blocker, readiness_answers, screening_answers",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!request) {
    notFound();
  }

  const canDelete = ["new"].includes(request.status ?? "");

  const { data: relatedOffer, error: relatedOfferError } = await supabase
    .from("offers")
    .select("id, status")
    .eq("screening_request_id", request.id)
    .in("status", ["sent", "accepted"])
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

  const { data: relatedCase, error: relatedCaseError } = relatedOrder
    ? await supabase
      .from("cases")
      .select("id, status")
      .eq("order_id", relatedOrder.id)
      .eq("client_id", user.id)
      .maybeSingle()
    : { data: null, error: null as null | Error };

  if (relatedCaseError) {
    throw new Error(relatedCaseError.message);
  }

  const paymentPending = relatedOrder?.payment_status === "pending";
  const paymentPaid = relatedOrder?.payment_status === "paid";

  const readinessAnswers =
    request.readiness_answers &&
      typeof request.readiness_answers === "object" &&
      !Array.isArray(request.readiness_answers)
      ? (request.readiness_answers as Record<string, unknown>)
      : {};

  const screeningAnswers =
    request.screening_answers &&
      typeof request.screening_answers === "object" &&
      !Array.isArray(request.screening_answers)
      ? (request.screening_answers as Record<string, unknown>)
      : {};

  const decision = getDecisionPresentation({
    triageResult: request.triage_result,
    recommendedPlan: request.recommended_plan,
  });

  const toneClasses = getDecisionToneClasses(decision.tone);

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title={request.name || "Screening Request"}
      description="Review the current decision, recommendation, and next relevant step for this screening."
      counts={counts}
    >
      <section className="space-y-6">
        <div>
          <Link
            href="/dashboard/screening"
            className="inline-flex text-[11px] uppercase tracking-[0.2em] text-[#9a8660] transition hover:text-[#0f1c2e]"
          >
            ← Back to my screenings
          </Link>
        </div>

        <article className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a8660]">
                Submitted
              </p>
              <p className="mt-1 text-[13px] text-[#6b7280]">
                {new Date(request.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                {formatStatusLabel(request.status)}
              </div>

              {request.recommended_plan ? (
                <div className="inline-flex justify-center rounded-full border border-[#dcc79e] bg-[#fff8ea] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#8b6d35] shadow-sm">
                  {formatRecommendedPlan(request.recommended_plan)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-6">
            {getScreeningProgressSteps({
              screeningStatus: request.status,
              paymentPending,
              paymentPaid,
              caseStatus: relatedCase?.status,
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

          <p className="mt-4 text-[13px] leading-6 text-[#6b7280]">
            {getStatusHelp(request.status)}
          </p>
        </article>

        <article
          className={[
            "rounded-[24px] border p-6 shadow-[0_18px_48px_rgba(148,119,66,0.08)] backdrop-blur",
            toneClasses.panel,
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

            {(request.triage_result || request.recommended_plan) ? (
              <div className="rounded-2xl border border-[#eadfca] bg-white/70 px-4 py-3 text-[12px] text-[#6b7280]">
                <div>
                  <span className="text-[#9a8660]">Triage:</span>{" "}
                  {formatTriageResult(request.triage_result)}
                </div>
                <div className="mt-1">
                  <span className="text-[#9a8660]">Plan:</span>{" "}
                  {formatRecommendedPlan(request.recommended_plan)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Main blocker
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                {request.primary_blocker || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Next step
              </div>
              <div className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                <p className="font-medium text-[#0f1c2e]">
                  {decision.nextStepTitle}
                </p>
                <p className="mt-2">{decision.nextStepBody}</p>
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

        <article className="rounded-[24px] border border-[#eadfca] bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <h3
            className="text-[24px] leading-tight text-[#0f1c2e]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Submitted frame
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

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Missing piece
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screeningAnswers.missingPiece)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Preferred help type
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {renderValue(screeningAnswers.helpType)}
              </dd>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#eadfca] bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
              Additional context
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[13px] text-[#6b7280]">
              {renderValue(screeningAnswers.additionalContext || request.notes)}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link
              href="/dashboard/screening"
              className="rounded-xl border border-[#dcc79e]/70 bg-white/70 px-4 py-2 text-xs text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
            >
              Back to Screening
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
              <form action={deleteOwnScreeningRequest.bind(null, request.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Delete this screening request? This cannot be undone."
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