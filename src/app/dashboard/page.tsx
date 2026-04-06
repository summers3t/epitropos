import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    new: "Submitted",
    accepted: "Accepted",
    rejected: "Rejected",
    offer_sent: "Offer sent",
    draft: "Draft",
    sent: "Sent",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
}

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

function formatClientCaseTitle(title: string | null | undefined) {
  if (!title) return "Case";

  return title.startsWith("Case for ")
    ? title.slice("Case for ".length)
    : title;
}

function formatClientReportTitle(title: string | null | undefined) {
  if (!title) return "Report";

  if (title.startsWith("Case for ") && title.endsWith(" Report")) {
    return `Report for ${title.slice("Case for ".length, -" Report".length)}`;
  }

  return title;
}

function getCurrentStageTitle({
  screeningStatus,
  caseStatus,
  hasReport,
  paymentPending,
  paymentPaid,
  hasCase,
}: {
  screeningStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasReport: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasCase: boolean;
}) {
  if (hasReport || caseStatus === "closed") {
    return "Completed engagement";
  }

  if (caseStatus === "delivered") {
    return "Report delivered";
  }

  if (caseStatus === "analysis") {
    return "In analysis";
  }

  if (caseStatus === "active") {
    return "Case open";
  }

  if (paymentPending) {
    return "Payment pending";
  }

  if (paymentPaid && hasCase) {
    return "Case open";
  }

  switch (screeningStatus) {
    case "new":
      return "Screening submitted";
    case "accepted":
      return "Accepted for offer";
    case "offer_sent":
      return "Offer issued";
    case "rejected":
      return "Screening closed";
    default:
      return "Current stage";
  }
}

function getCurrentStageText({
  screeningStatus,
  caseStatus,
  hasReport,
  paymentPending,
  paymentPaid,
  hasCase,
}: {
  screeningStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasReport: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasCase: boolean;
}) {
  if (hasReport || caseStatus === "closed") {
    return "Your latest screening and case cycle has been completed. The report has already been delivered and no further action is required for this engagement.";
  }

  if (caseStatus === "delivered") {
    return "Your report has been delivered and is available in the portal. This engagement is now in its final stage.";
  }

  if (caseStatus === "analysis") {
    return "Your case is currently in analysis. The engagement is active and the report is not yet finalized.";
  }

  if (caseStatus === "active") {
    return "Your payment has been confirmed and your case is open in the client portal.";
  }

  if (paymentPending) {
    return "Your offer has been accepted and payment is awaiting confirmation before the case can be opened.";
  }

  if (paymentPaid && hasCase) {
    return "Your payment has been confirmed and your case is already open. You can now follow the analysis through your case workspace.";
  }

  switch (screeningStatus) {
    case "new":
      return "Your screening request has been submitted and is awaiting review.";
    case "accepted":
      return "Your screening has been accepted and the commercial offer is being prepared.";
    case "offer_sent":
      return "Your offer has already been issued and is awaiting your decision or payment completion.";
    case "rejected":
      return "This screening request was reviewed and closed without moving forward to engagement.";
    default:
      return "Open the screening record for more detail.";
  }
}

function getNextActionTitle({
  screeningStatus,
  caseStatus,
  hasReport,
  paymentPending,
  paymentPaid,
  hasActionableOffer,
}: {
  screeningStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasReport: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasActionableOffer: boolean;
}) {
  if (hasReport || caseStatus === "closed") {
    return "Next Action";
  }

  if (caseStatus === "delivered") {
    return "Next Action";
  }

  if (caseStatus === "analysis" || caseStatus === "active") {
    return "Next Action";
  }

  if (paymentPending) {
    return "Next Action";
  }

  if (paymentPaid) {
    return "Next Action";
  }

  switch (screeningStatus) {
    case "new":
      return "Next Action";
    case "accepted":
      return "Next Action";
    case "offer_sent":
      return "Next Action";
    case "rejected":
      return "Next Action";
    default:
      return "Next Action";
  }
}

function getNextActionHeading({
  screeningStatus,
  caseStatus,
  hasReport,
  paymentPending,
  paymentPaid,
  hasActionableOffer,
}: {
  screeningStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasReport: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasActionableOffer: boolean;
}) {
  if (hasReport || caseStatus === "closed") {
    return "Begin new screening";
  }

  if (caseStatus === "delivered") {
    return "Review your report";
  }

  if (caseStatus === "analysis" || caseStatus === "active") {
    return "Open active case";
  }

  if (paymentPending) {
    return "Await payment confirmation";
  }

  if (paymentPaid) {
    return "Open active case";
  }

  if (hasActionableOffer) {
    return "Offer available for review";
  }

  switch (screeningStatus) {
    case "new":
      return "Await screening review";
    case "accepted":
      return "Await issued offer";
    case "offer_sent":
      return "Review issued offer";
    case "rejected":
      return "Begin new screening";
    default:
      return "No action required";
  }
}

function getNextActionText({
  screeningStatus,
  caseStatus,
  hasReport,
  paymentPending,
  paymentPaid,
  hasActionableOffer,
}: {
  screeningStatus: string | null | undefined;
  caseStatus: string | null | undefined;
  hasReport: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasActionableOffer: boolean;
}) {
  if (hasReport || caseStatus === "closed") {
    return "This engagement is finished. If you want a new property review, begin a new screening request.";
  }

  if (caseStatus === "delivered") {
    return "Your report is already available. Review the completed deliverable from the reports section.";
  }

  if (caseStatus === "analysis" || caseStatus === "active") {
    return "Your engagement is still active. Continue from the case workspace.";
  }

  if (paymentPending) {
    return "Your offer has already been accepted. Open the payment status page to track confirmation before the case is opened.";
  }

  if (paymentPaid) {
    return "Your payment has been recorded and your case is now open in the client portal.";
  }

  if (hasActionableOffer) {
    return "You have a client offer ready for review.";
  }

  switch (screeningStatus) {
    case "new":
      return "No client action is required while the screening is under review.";
    case "accepted":
      return "No client action is required until the offer is issued.";
    case "offer_sent":
      return "Open the related offer, review the terms, and proceed if you want to continue.";
    case "rejected":
      return "This screening cycle is complete. Start a new screening if you want to submit another property request.";
    default:
      return "There is no client action required at this stage.";
  }
}

function formatClientDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type PageProps = {
  searchParams: Promise<{ screening_created?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: screeningRequests, error: screeningError } = await supabase
    .from("screening_requests")
    .select("id, name, status, created_at, plan_interest, budget_range, goal")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  const screeningIds = screeningRequests?.map((request) => request.id) ?? [];

  const { data: offers, error: offersError } =
    screeningIds.length > 0
      ? await supabase
          .from("offers")
          .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at",
          )
          .in("screening_request_id", screeningIds)
          .in("status", ["sent", "accepted"])
          .order("created_at", { ascending: false })
      : { data: [], error: null as null | Error };

  if (offersError) {
    throw new Error(offersError.message);
  }

  const activeOfferByScreeningId = new Map(
    (offers ?? []).map((offer) => [offer.screening_request_id, offer]),
  );

  const offerIds = (offers ?? []).map((offer) => offer.id);

  const { data: orders, error: ordersLookupError } =
    offerIds.length > 0
      ? await supabase
          .from("orders")
          .select("offer_id, payment_status")
          .in("offer_id", offerIds)
      : { data: [], error: null as null | Error };

  if (ordersLookupError) {
    throw new Error(ordersLookupError.message);
  }

  const ordersByOfferId = new Map(
    (orders ?? []).map((order) => [order.offer_id, order]),
  );

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id, title, status, created_at, screening_request_id")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (casesError) {
    throw new Error(casesError.message);
  }

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select(
      `
            id,
            title,
            summary,
            file_url,
            published,
            created_at,
            published_at,
            case_id,
            cases!inner (
                id,
                title,
                client_id
            )
            `,
    )
    .eq("published", true)
    .eq("cases.client_id", user.id)
    .order("published_at", { ascending: false });

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  const latestScreening = screeningRequests?.[0] ?? null;

  const latestCase = cases?.[0] ?? null;

  const latestReport = reports?.[0] ?? null;

  const screeningCount = screeningRequests?.length ?? 0;

  const caseCount = cases?.length ?? 0;

  const reportCount = reports?.length ?? 0;

  const latestCaseStatus = latestCase?.status ?? null;

  const hasDeliveredReport = !!latestReport;

  const prioritizedJourneyScreening =
    (screeningRequests ?? []).find((request) => {
      const offer = activeOfferByScreeningId.get(request.id);
      return offer?.status === "sent" || offer?.status === "accepted";
    }) ?? latestScreening;

  const latestOffer = prioritizedJourneyScreening
    ? activeOfferByScreeningId.get(prioritizedJourneyScreening.id)
    : null;

  const latestOrder = latestOffer ? ordersByOfferId.get(latestOffer.id) : null;

  const hasActionableOffer =
    latestOffer?.status === "sent" || latestOffer?.status === "accepted";

  const paymentPending = latestOrder?.payment_status === "pending";

  const paymentPaid = latestOrder?.payment_status === "paid";

  const hasCase = !!latestCase;

  const recentScreenings = (screeningRequests ?? []).slice(0, 5);
  const recentCases = (cases ?? []).slice(0, 4);

  const welcomeName =
    typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string" &&
          user.user_metadata.name.trim().length > 0
        ? user.user_metadata.name
        : "Client";

  return (
    <ClientPortalShell
      eyebrow="Dashboard"
      title={`Welcome, ${welcomeName}`}
      counts={{
        screenings: screeningCount,
        cases: caseCount,
        reports: reportCount,
      }}
      headerContent={
        <div
          className={[
            "grid gap-4 lg:items-stretch",
            latestScreening
              ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]"
              : "lg:grid-cols-[minmax(0,1fr)]",
          ].join(" ")}
        >
          <div className="space-y-2 min-h-[118px] pr-2">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a8660]">
              Dashboard
            </p>

            <h1
              className="text-[24px] leading-tight text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Welcome, {welcomeName}
            </h1>

            <p className="max-w-2xl text-[12.5px] leading-[1.5] text-[#6b7280]">
              Follow your screening progress, active engagement, and published
              deliverables from one place.
            </p>
          </div>

          {latestScreening ? (
            <>
              <div className="hidden bg-[#ccb07a] lg:block lg:opacity-90" />

              <div className="space-y-2 min-h-[118px] px-2">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a8660]">
                  Current Stage
                </p>

                <h2
                  className="text-[24px] leading-tight text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {getCurrentStageTitle({
                    screeningStatus: latestScreening.status,
                    caseStatus: latestCaseStatus,
                    hasReport: hasDeliveredReport,
                    paymentPending,
                    paymentPaid,
                    hasCase,
                  })}
                </h2>

                <p className="max-w-2xl text-[12.5px] leading-[1.5] text-[#6b7280]">
                  {getCurrentStageText({
                    screeningStatus: latestScreening.status,
                    caseStatus: latestCaseStatus,
                    hasReport: hasDeliveredReport,
                    paymentPending,
                    paymentPaid,
                    hasCase,
                  })}
                </p>
              </div>

              <div className="hidden bg-[#ccb07a] lg:block lg:opacity-90" />

              <div className="space-y-2 min-h-[118px] pl-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a8660]">
                    {getNextActionTitle({
                      screeningStatus: latestScreening.status,
                      caseStatus: latestCaseStatus,
                      hasReport: hasDeliveredReport,
                      paymentPending,
                      paymentPaid,
                      hasActionableOffer,
                    })}
                  </p>

                  {!hasDeliveredReport &&
                  latestCaseStatus !== "closed" &&
                  !paymentPaid &&
                  hasActionableOffer ? (
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      1
                    </span>
                  ) : null}
                </div>

                <h2
                  className="text-[24px] leading-tight text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {getNextActionHeading({
                    screeningStatus: prioritizedJourneyScreening?.status,

                    caseStatus: latestCaseStatus,

                    hasReport: hasDeliveredReport,

                    paymentPending,

                    paymentPaid,

                    hasActionableOffer,
                  })}
                </h2>

                <p className="max-w-2xl text-[12.5px] leading-[1.5] text-[#6b7280]">
                  {getNextActionText({
                    screeningStatus: prioritizedJourneyScreening?.status,

                    caseStatus: latestCaseStatus,

                    hasReport: hasDeliveredReport,

                    paymentPending,

                    paymentPaid,

                    hasActionableOffer,
                  })}
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  {hasDeliveredReport || latestCaseStatus === "closed" ? (
                    <Link
                      href="/screening"
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Begin Screening
                    </Link>
                  ) : latestCaseStatus === "delivered" ? (
                    <Link
                      href="/dashboard/reports"
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Open Reports
                    </Link>
                  ) : paymentPaid ? (
                    <Link
                      href="/dashboard/cases"
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Open Cases
                    </Link>
                  ) : paymentPending ? (
                    <Link
                      href={`/dashboard/payment/${latestOffer?.id}`}
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Open Payment Status
                    </Link>
                  ) : hasActionableOffer ? (
                    <Link
                      href={`/dashboard/offers/${latestOffer?.id}`}
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      View Offer
                    </Link>
                  ) : prioritizedJourneyScreening?.status === "rejected" ? (
                    <Link
                      href="/screening"
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Begin Screening
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-10">
        {params.screening_created === "1" ? (
          <div className="border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            Screening application submitted successfully.
          </div>
        ) : null}

        <div className="space-y-10">
          <section className="min-w-0">
            {recentScreenings.length > 0 ? (
              <div className="min-w-0">
                <div className="hidden grid-cols-[minmax(0,1fr)_1fr_1fr_1fr] gap-6 px-2 py-3 text-[10px] uppercase tracking-[0.32em] text-[#9a8660] lg:grid">
                  <div>Screening</div>
                  <div>Date</div>
                  <div>Budget</div>
                  <div className="text-center">Status</div>
                </div>

                <div className="space-y-0">
                  {recentScreenings.map((request) => (
                    <article
                      key={request.id}
                      className="border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                    >
                      <Link
                        href={`/dashboard/screening/${request.id}`}
                        className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_1fr_1fr_1fr] lg:items-center lg:gap-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#0f1c2e]">
                            {request.name || "Screening request"}
                          </p>
                        </div>

                        <div className="text-[13px] text-[#6b7280]">
                          {formatClientDate(request.created_at)}
                        </div>

                        <div className="text-[13px] text-[#6b7280]">
                          {request.budget_range || "—"}
                        </div>

                        <div className="flex justify-start lg:justify-center">
                          <div className="flex w-full justify-start lg:justify-center">
                            <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/75 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                              {formatStatusLabel(request.status)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8">
                <p
                  className="text-[28px] leading-none text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  No screenings yet.
                </p>
                <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
                  Screening is the required first step before any offer,
                  payment, or case creation.
                </p>
                <div className="mt-5">
                  <Link
                    href="/screening"
                    className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                  >
                    Apply for Screening
                  </Link>
                </div>
              </div>
            )}
          </section>
          <section className="min-w-0">
            {recentCases.length > 0 ? (
              <div className="min-w-0">
                <div className="hidden grid-cols-[minmax(0,1fr)_1fr_1fr_1fr] gap-6 px-2 py-3 text-[10px] uppercase tracking-[0.32em] text-[#9a8660] lg:grid">
                  <div>Case</div>
                  <div>Date</div>
                  <div>Plan</div>
                  <div className="text-center">Status</div>
                </div>

                <div className="space-y-0">
                  {recentCases.map((item) => {
                    const screening = item.screening_request_id
                      ? (screeningRequests?.find(
                          (request) => request.id === item.screening_request_id,
                        ) ?? null)
                      : null;

                    return (
                      <article
                        key={item.id}
                        className="border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                      >
                        <Link
                          href={`/dashboard/cases/${item.id}`}
                          className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_1fr_1fr_1fr] lg:items-center lg:gap-6"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-[#0f1c2e]">
                              {formatClientCaseTitle(item.title)}
                            </p>
                          </div>

                          <div className="text-[13px] text-[#6b7280]">
                            {formatClientDate(item.created_at)}
                          </div>

                          <div className="text-[13px] text-[#6b7280]">
                            {screening?.plan_interest
                              ? formatPlanLabel(screening.plan_interest)
                              : "—"}
                          </div>

                          <div className="flex justify-start lg:justify-center">
                            <div className="flex w-full justify-start lg:justify-center">
                              <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/75 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                                {formatCaseStatusLabel(item.status)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8">
                <p
                  className="text-2xl leading-none text-[#f3e7d8]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  No active cases.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#8f95a2]">
                  Your case will appear here after payment is confirmed and the
                  engagement is opened.
                </p>
              </div>
            )}
          </section>
        </div>

        {latestReport ? (
          <section className="min-w-0">
            <div className="border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2 pr-2">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a8660]">
                    Latest Report
                  </p>

                  <h2
                    className="text-[20px] leading-tight text-[#0f1c2e]"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {formatClientReportTitle(latestReport.title)}
                  </h2>

                  <p className="text-[13px] text-[#6b7280]">
                    Published{" "}
                    {latestReport.published_at
                      ? formatClientDate(latestReport.published_at)
                      : formatClientDate(latestReport.created_at)}
                  </p>

                  {latestReport.summary ? (
                    <p className="max-w-2xl text-[13px] leading-6 text-[#6b7280]">
                      {latestReport.summary}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/reports"
                    className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                  >
                    Open Reports
                  </Link>

                  {latestReport.file_url ? (
                    <a
                      href={latestReport.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                    >
                      Open Report
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </ClientPortalShell>
  );
}
