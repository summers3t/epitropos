import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { deleteOwnScreeningRequest } from "../deleteScreeningRequest";

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    new: "New",
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
      label: "Under review",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "offer",
      label: "Offer issued",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "payment",
      label: "Payment confirmed",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "analysis",
      label: "In analysis",
      state: "upcoming" as "done" | "current" | "upcoming",
    },
    {
      key: "outcome",
      label: "Outcome delivered",
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

    base[3].state = "upcoming";
    return base;
  }

  base[1].state = "current";
  return base;
}

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
      "id, user_id, name, status, created_at, budget_range, budget_min, budget_max, currency, financing_type, goal, risk_tolerance, preferred_markets, decision_timeline, phone, property_identified, listing_url, plan_interest, notes",
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

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title={request.name || "Screening Request"}
      description="Review your submitted screening details and the current status of this request."
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

            <div className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
              {formatStatusLabel(request.status)}
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

          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Screening / case label
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.name || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Status
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {formatStatusLabel(request.status)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Submitted
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {new Date(request.created_at).toLocaleString()}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Phone
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.phone || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Plan interest
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.plan_interest || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Investment objective
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.goal || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Risk tolerance
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.risk_tolerance || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Preferred markets
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.preferred_markets || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Budget range
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.budget_range || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Budget minimum / maximum
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.budget_min && request.budget_max
                  ? `${request.currency || ""} ${request.budget_min} — ${request.budget_max}`
                  : "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Decision timeline
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.decision_timeline || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Financing type
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.financing_type || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Property identified
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {request.property_identified ? "Yes" : "No"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Listing link
              </dt>
              <dd className="mt-1 break-all text-[13px] text-[#6b7280]">
                {request.listing_url || "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-2xl border border-[#eadfca] bg-white/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
              Additional context
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[13px] text-[#6b7280]">
              {request.notes || "—"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link
              href="/dashboard/screening"
              className="rounded-xl border border-[#dcc79e]/70 bg-white/70 px-4 py-2 text-xs text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
            >
              Back to Screening
            </Link>

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
