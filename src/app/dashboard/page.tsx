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

type ScreeningRequestRow = {
  id: string;
  name: string | null;
  status: string | null;
  created_at: string;
  plan_interest: string | null;
  budget_range: string | null;
  goal: string | null;
};

type OfferRow = {
  id: string;
  screening_request_id: string;
  plan_type: string | null;
  price_amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
};

type OrderRow = {
  offer_id: string;
  payment_status: string | null;
};

type CaseRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
  screening_request_id: string | null;
};

type ReportRow = {
  id: string;
  title: string | null;
  summary: string | null;
  file_url: string | null;
  published: boolean;
  created_at: string;
  published_at: string | null;
  case_id: string;
  cases: {
    id: string;
    title: string | null;
    client_id: string;
  };
};

type NextActionState = {
  heading: string;
  text: string;
  href: string | null;
  ctaLabel: string | null;
};

function getNextActionState({
  screeningRequests,
  offers,
  ordersByOfferId,
  cases,
  reports,
}: {
  screeningRequests: ScreeningRequestRow[];
  offers: OfferRow[];
  ordersByOfferId: Map<string, OrderRow>;
  cases: CaseRow[];
  reports: ReportRow[];
}): NextActionState {
  const newestSentOffer =
    offers.find((offer) => offer.status === "sent") ?? null;

  const newestAcceptedOfferWithPendingPayment =
    offers.find((offer) => {
      if (offer.status !== "accepted") return false;

      const order = ordersByOfferId.get(offer.id);
      return order?.payment_status === "pending";
    }) ?? null;

  if (newestSentOffer && newestAcceptedOfferWithPendingPayment) {
    const sentDate = new Date(newestSentOffer.created_at).getTime();
    const pendingDate = new Date(
      newestAcceptedOfferWithPendingPayment.created_at,
    ).getTime();

    if (sentDate >= pendingDate) {
      return {
        heading: "Offer available for review",
        text: "A newer client offer is waiting for your decision. Review the offer terms and accept it only if you want to proceed.",
        href: `/dashboard/offers/${newestSentOffer.id}`,
        ctaLabel: "View Offer",
      };
    }

    return {
      heading: "Open payment status",
      text: "Your latest accepted offer is now in the payment stage. Open the payment page to track confirmation before the case is opened.",
      href: `/dashboard/payment/${newestAcceptedOfferWithPendingPayment.id}`,
      ctaLabel: "Open Payment Status",
    };
  }

  if (newestSentOffer) {
    return {
      heading: "Offer available for review",
      text: "A client offer is waiting for your decision. Review the offer terms and accept it only if you want to proceed.",
      href: `/dashboard/offers/${newestSentOffer.id}`,
      ctaLabel: "View Offer",
    };
  }

  if (newestAcceptedOfferWithPendingPayment) {
    return {
      heading: "Open payment status",
      text: "Your accepted offer is now in the payment stage. Open the payment page to track confirmation before the case is opened.",
      href: `/dashboard/payment/${newestAcceptedOfferWithPendingPayment.id}`,
      ctaLabel: "Open Payment Status",
    };
  }

  const latestOpenCase =
    cases.find(
      (item) => item.status === "active" || item.status === "analysis",
    ) ?? null;

  if (latestOpenCase) {
    return {
      heading: "Open active case",
      text: "Your engagement is active. Continue from the case workspace.",
      href: `/dashboard/cases/${latestOpenCase.id}`,
      ctaLabel: "Open Case",
    };
  }

  const latestDeliveredCase =
    cases.find((item) => item.status === "delivered") ?? null;

  if (latestDeliveredCase || reports.length > 0) {
    return {
      heading: "Review your report",
      text: "Your completed deliverable is already available in the portal.",
      href: "/dashboard/reports",
      ctaLabel: "Open Reports",
    };
  }

  const latestScreening = screeningRequests[0] ?? null;

  if (latestScreening?.status === "accepted") {
    return {
      heading: "Await issued offer",
      text: "Your screening has been accepted. No client action is required until the offer is issued.",
      href: null,
      ctaLabel: null,
    };
  }

  if (latestScreening?.status === "new") {
    return {
      heading: "Await screening review",
      text: "Your screening request has been submitted and is awaiting review.",
      href: null,
      ctaLabel: null,
    };
  }

  if (latestScreening?.status === "rejected") {
    return {
      heading: "Begin new screening",
      text: "This screening cycle is complete. Start a new screening if you want to submit another property request.",
      href: "/screening",
      ctaLabel: "Begin Screening",
    };
  }

  return {
    heading: "Begin screening",
    text: "Screening is the required first step before any offer, payment, or case creation.",
    href: "/screening",
    ctaLabel: "Begin Screening",
  };
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

  const screeningRows = (screeningRequests ?? []) as ScreeningRequestRow[];
  const offerRows = (offers ?? []) as OfferRow[];
  const caseRows = (cases ?? []) as CaseRow[];
  const reportRows = (reports ?? []) as ReportRow[];

  const screeningCount = screeningRows.length;
  const caseCount = caseRows.length;
  const reportCount = reportRows.length;

  const recentScreenings = screeningRows.slice(0, 5);
  const recentCases = caseRows.slice(0, 4);
  const latestReport = reportRows[0] ?? null;

  const welcomeName =
    typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string" &&
          user.user_metadata.name.trim().length > 0
        ? user.user_metadata.name
        : "Client";

  const nextAction = getNextActionState({
    screeningRequests: screeningRows,
    offers: offerRows,
    ordersByOfferId,
    cases: caseRows,
    reports: reportRows,
  });

  return (
    <ClientPortalShell
      eyebrow="Dashboard"
      title="Client Portal"
      description="Follow your screening progress, active engagement, and published deliverables from one place."
      counts={{
        screenings: screeningCount,
        cases: caseCount,
        reports: reportCount,
      }}
      headerContent={
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/50 bg-white/35 px-5 py-4 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a8660]">
              Welcome
            </p>
            <h1
              className="mt-2 text-[30px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Welcome, {welcomeName}
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Use the client portal to track screening, payment, cases, and
              final reports.
            </p>
          </section>

          <section className="rounded-2xl border border-[#dcc79e]/80 bg-white/45 px-5 py-4 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a8660]">
              Next Action
            </p>

            <h2
              className="mt-2 text-[26px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {nextAction.heading}
            </h2>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              {nextAction.text}
            </p>

            {nextAction.href && nextAction.ctaLabel ? (
              <div className="mt-4">
                <Link
                  href={nextAction.href}
                  className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                >
                  {nextAction.ctaLabel}
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      }
    >
      <div className="space-y-10">
        {params.screening_created === "1" ? (
          <div className="rounded-2xl border border-[#d6b67a] bg-white/70 px-5 py-4 text-sm text-[#9a6a16] shadow-sm">
            Screening application submitted successfully.
          </div>
        ) : null}

        {recentScreenings.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8660]">
                  Recent Screenings
                </p>
                <h2
                  className="mt-2 text-[28px] leading-none text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Screening
                </h2>
              </div>

              <Link
                href="/dashboard/screening"
                className="text-[12px] uppercase tracking-[0.16em] text-[#9a8660] transition hover:text-[#0f1c2e]"
              >
                View all
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#dcc79e]/70 bg-white/70 shadow-[0_20px_50px_rgba(15,28,46,0.05)]">
              <div className="hidden grid-cols-[minmax(0,2fr)_120px_140px_160px] gap-4 border-b border-[#eadfc8] px-6 py-4 text-[11px] uppercase tracking-[0.16em] text-[#9a8660] md:grid">
                <div>Screening</div>
                <div>Date</div>
                <div>Budget</div>
                <div>Status</div>
              </div>

              <div className="divide-y divide-[#eadfc8]">
                {recentScreenings.map((request) => (
                  <Link
                    key={request.id}
                    href={`/dashboard/screening/${request.id}`}
                    className="grid gap-3 px-6 py-5 transition hover:bg-white/70 md:grid-cols-[minmax(0,2fr)_120px_140px_160px] md:items-center"
                  >
                    <div>
                      <div className="text-[15px] font-medium text-[#0f1c2e]">
                        {request.name || "Screening request"}
                      </div>
                    </div>

                    <div className="text-[13px] text-[#6b7280]">
                      {formatClientDate(request.created_at)}
                    </div>

                    <div className="text-[13px] text-[#6b7280]">
                      {request.budget_range || "—"}
                    </div>

                    <div>
                      <span className="inline-flex rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="py-8">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No screenings yet.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Screening is the required first step before any offer, payment, or
              case creation.
            </p>

            <div className="mt-5">
              <Link
                href="/screening"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Apply for Screening
              </Link>
            </div>
          </section>
        )}

        {recentCases.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8660]">
                  Active And Recent Cases
                </p>
                <h2
                  className="mt-2 text-[28px] leading-none text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Cases
                </h2>
              </div>

              <Link
                href="/dashboard/cases"
                className="text-[12px] uppercase tracking-[0.16em] text-[#9a8660] transition hover:text-[#0f1c2e]"
              >
                View all
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#dcc79e]/70 bg-white/70 shadow-[0_20px_50px_rgba(15,28,46,0.05)]">
              <div className="hidden grid-cols-[minmax(0,2fr)_120px_140px_160px] gap-4 border-b border-[#eadfc8] px-6 py-4 text-[11px] uppercase tracking-[0.16em] text-[#9a8660] md:grid">
                <div>Case</div>
                <div>Date</div>
                <div>Plan</div>
                <div>Status</div>
              </div>

              <div className="divide-y divide-[#eadfc8]">
                {recentCases.map((item) => {
                  const screening = item.screening_request_id
                    ? (screeningRows.find(
                        (request) => request.id === item.screening_request_id,
                      ) ?? null)
                    : null;

                  return (
                    <Link
                      key={item.id}
                      href={`/dashboard/cases/${item.id}`}
                      className="grid gap-3 px-6 py-5 transition hover:bg-white/70 md:grid-cols-[minmax(0,2fr)_120px_140px_160px] md:items-center"
                    >
                      <div className="text-[15px] font-medium text-[#0f1c2e]">
                        {formatClientCaseTitle(item.title)}
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {formatClientDate(item.created_at)}
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {screening?.plan_interest
                          ? formatPlanLabel(screening.plan_interest)
                          : "—"}
                      </div>

                      <div>
                        <span className="inline-flex rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                          {formatCaseStatusLabel(item.status)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className="py-2">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No active cases.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Your case will appear here after payment is confirmed and the
              engagement is opened.
            </p>
          </section>
        )}

        {latestReport ? (
          <section className="rounded-2xl border border-[#dcc79e]/70 bg-white/70 px-6 py-6 shadow-[0_20px_50px_rgba(15,28,46,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8660]">
              Latest Report
            </p>

            <h2
              className="mt-2 text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {formatClientReportTitle(latestReport.title)}
            </h2>

            <p className="mt-3 text-[13px] leading-6 text-[#6b7280]">
              Published{" "}
              {latestReport.published_at
                ? formatClientDate(latestReport.published_at)
                : formatClientDate(latestReport.created_at)}
            </p>

            {latestReport.summary ? (
              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-[#6b7280]">
                {latestReport.summary}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
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
          </section>
        ) : null}
      </div>
    </ClientPortalShell>
  );
}
