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

function getScreeningNextStepTitle({
  screeningStatus,
  paymentPending,
  paymentPaid,
  hasCase,
}: {
  screeningStatus: string | null | undefined;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasCase: boolean;
}) {
  if (paymentPaid && hasCase) {
    return "Current stage";
  }

  if (paymentPending) {
    return "Next expected step";
  }

  switch (screeningStatus) {
    case "new":
      return "What happens next";
    case "accepted":
      return "Next expected step";
    case "offer_sent":
      return "What you should do now";
    case "rejected":
      return "Current outcome";
    default:
      return "Next step";
  }
}

function getScreeningNextStepText({
  screeningStatus,
  paymentPending,
  paymentPaid,
  hasCase,
}: {
  screeningStatus: string | null | undefined;
  paymentPending: boolean;
  paymentPaid: boolean;
  hasCase: boolean;
}) {
  if (paymentPaid && hasCase) {
    return "Your payment has been confirmed and your case is already open. You can now follow the analysis through your case workspace.";
  }

  if (paymentPending) {
    return "Your offer has been accepted and payment is awaiting confirmation. Once confirmed, your case will appear in the client portal.";
  }

  switch (screeningStatus) {
    case "new":
      return "We review your submitted details and decide whether to move this request into the commercial offer stage.";
    case "accepted":
      return "We prepare your commercial offer. Once it is issued, it will appear here and in your offers section.";
    case "offer_sent":
      return "Open the related offer, review the terms, and follow the payment step if you choose to proceed.";
    case "rejected":
      return "No further action is required from you for this screening request.";
    default:
      return "Open the screening record for more detail.";
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

  const latestOffer = latestScreening
    ? activeOfferByScreeningId.get(latestScreening.id)
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
    >
      <div className="space-y-10">
        {params.screening_created === "1" ? (
          <div className="border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            Screening application submitted successfully.
          </div>
        ) : null}

        {hasActionableOffer ? (
          <section className="border border-white/10 px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
                    Next Action
                  </p>

                  {!paymentPaid ? (
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      1
                    </span>
                  ) : null}
                </div>

                <h2
                  className="text-3xl leading-none text-[#f3e7d8]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {paymentPaid
                    ? "Payment confirmed"
                    : paymentPending
                      ? "Payment pending confirmation"
                      : "Offer available for review"}
                </h2>

                <p className="max-w-2xl text-sm leading-7 text-[#8f95a2]">
                  {paymentPaid
                    ? "Your payment has been recorded and your case is now open in the client portal."
                    : paymentPending
                      ? "Your offer has been accepted and payment is awaiting confirmation."
                      : "You have a client offer ready for review."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={
                    paymentPaid
                      ? "/dashboard/cases"
                      : `/dashboard/offers/${latestOffer?.id}`
                  }
                  className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                >
                  {paymentPaid
                    ? "Open Cases"
                    : paymentPending
                      ? "Open Offer Status"
                      : "View Offer"}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="min-w-0">
            <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
                Active Cases
              </p>

              <Link
                href="/dashboard/cases"
                className="text-sm text-[#d6b26b] transition hover:text-[#f0c87d]"
              >
                View All →
              </Link>
            </div>

            {recentCases.length > 0 ? (
              <div className="min-w-0">
                <div className="hidden grid-cols-[minmax(0,1.3fr)_120px_170px_110px_36px] gap-6 px-2 py-4 text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad] lg:grid">
                  <div>Case</div>
                  <div>Date</div>
                  <div>Selected Plan</div>
                  <div className="text-right">Status</div>
                  <div />
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
                        className="border-b border-white/10 px-2 py-5 transition hover:bg-white/[0.02]"
                      >
                        <Link
                          href={`/dashboard/cases/${item.id}`}
                          className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.3fr)_120px_170px_110px_36px] lg:items-center lg:gap-6"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-[#f3e7d8]">
                              {formatClientCaseTitle(item.title)}
                            </p>
                          </div>

                          <div className="text-sm text-[#9aa0ad]">
                            {formatClientDate(item.created_at)}
                          </div>

                          <div className="truncate text-sm text-[#9aa0ad]">
                            {screening?.plan_interest
                              ? formatPlanLabel(screening.plan_interest)
                              : "—"}
                          </div>

                          <div className="flex justify-start lg:justify-end">
                            <span className="inline-flex border border-[#b8935c] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#d6b26b]">
                              {formatCaseStatusLabel(item.status)}
                            </span>
                          </div>

                          <div className="hidden justify-end text-[#7e8797] lg:flex">
                            <span className="text-2xl leading-none">→</span>
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

          <section className="min-w-0">
            <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
                Recent Screenings
              </p>

              <Link
                href="/dashboard/screening"
                className="text-sm text-[#d6b26b] transition hover:text-[#f0c87d]"
              >
                View All →
              </Link>
            </div>

            {recentScreenings.length > 0 ? (
              <div className="min-w-0">
                <div className="hidden grid-cols-[minmax(0,1.1fr)_120px_180px_140px] gap-6 px-2 py-4 text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad] lg:grid">
                  <div>Screening</div>
                  <div>Date</div>
                  <div>Budget</div>
                  <div className="text-right">Status</div>
                </div>

                <div className="space-y-0">
                  {recentScreenings.map((request) => (
                    <article
                      key={request.id}
                      className="border-b border-white/10 px-2 py-5 transition hover:bg-white/[0.02]"
                    >
                      <Link
                        href={`/dashboard/screening/${request.id}`}
                        className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.1fr)_120px_180px_140px] lg:items-center lg:gap-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[#f3e7d8]">
                            {request.name || "Screening request"}
                          </p>
                        </div>

                        <div className="text-sm text-[#9aa0ad]">
                          {formatClientDate(request.created_at)}
                        </div>

                        <div className="truncate text-sm text-[#9aa0ad]">
                          {request.budget_range || "—"}
                        </div>

                        <div className="flex justify-start lg:justify-end">
                          <span className="inline-flex border border-[#b8935c] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#d6b26b]">
                            {formatStatusLabel(request.status)}
                          </span>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8">
                <p
                  className="text-2xl leading-none text-[#f3e7d8]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  No screenings yet.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#8f95a2]">
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
        </div>

        {latestScreening ? (
          <section className="border border-white/10 px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
                  {getScreeningNextStepTitle({
                    screeningStatus: latestScreening.status,
                    paymentPending,
                    paymentPaid,
                    hasCase,
                  })}
                </p>

                <h2
                  className="text-3xl leading-none text-[#f3e7d8]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {latestScreening.name || "Latest screening request"}
                </h2>

                <p className="max-w-2xl text-sm leading-7 text-[#8f95a2]">
                  {getScreeningNextStepText({
                    screeningStatus: latestScreening.status,
                    paymentPending,
                    paymentPaid,
                    hasCase,
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/screening/${latestScreening.id}`}
                  className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                >
                  Open Screening
                </Link>

                {paymentPaid && hasCase ? (
                  <Link
                    href="/dashboard/cases"
                    className="inline-flex items-center border border-white/10 px-5 py-2.5 text-sm text-[#c9cdd5] transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Open Cases
                  </Link>
                ) : null}

                {latestOffer ? (
                  <Link
                    href={`/dashboard/offers/${latestOffer.id}`}
                    className="inline-flex items-center border border-white/10 px-5 py-2.5 text-sm text-[#c9cdd5] transition hover:bg-white/[0.04] hover:text-white"
                  >
                    {formatPlanLabel(latestOffer.plan_type)}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {latestReport ? (
          <section className="border border-white/10 px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
              Latest Report
            </p>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <h2
                  className="text-3xl leading-none text-[#f3e7d8]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {formatClientReportTitle(latestReport.title)}
                </h2>

                <p className="text-sm text-[#8f95a2]">
                  Published{" "}
                  {latestReport.published_at
                    ? formatClientDate(latestReport.published_at)
                    : formatClientDate(latestReport.created_at)}
                </p>

                {latestReport.summary ? (
                  <p className="max-w-2xl text-sm leading-7 text-[#8f95a2]">
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
                    className="inline-flex items-center border border-white/10 px-5 py-2.5 text-sm text-[#c9cdd5] transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Open Report
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </ClientPortalShell>
  );
}
