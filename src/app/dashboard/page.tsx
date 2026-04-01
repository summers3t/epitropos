import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    const labels: Record<string, string> = {
        new: "New",
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

    return title.startsWith("Case for ") ? title.slice("Case for ".length) : title;
}

function formatClientReportTitle(title: string | null | undefined) {
    if (!title) return "Report";

    if (title.startsWith("Case for ") && title.endsWith(" Report")) {
        return `Report for ${title.slice("Case for ".length, -(" Report".length))}`;
    }

    return title;
}

function getScreeningStatusHelp(status: string | null | undefined) {
    switch (status) {
        case "new":
            return "Your request has been received and is waiting for review.";
        case "accepted":
            return "Your screening has been accepted and the next step is preparation of your commercial offer.";
        case "offer_sent":
            return "Your offer is ready for review in the client portal.";
        case "rejected":
            return "This request was reviewed but was not accepted for further engagement.";
        default:
            return "Your screening status will appear here.";
    }
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

function getSoftStatusClasses(status: string | null | undefined) {
    switch (status) {
        case "accepted":
        case "active":
        case "delivered":
            return "border-emerald-400/35 bg-emerald-500/10 text-emerald-900";
        case "offer_sent":
        case "analysis":
        case "sent":
            return "border-amber-400/35 bg-amber-500/10 text-amber-900";
        case "rejected":
        case "cancelled":
        case "expired":
        case "closed":
            return "border-[#d8cab8] bg-[#ece2d5] text-[#6c5f51]";
        default:
            return "border-[#d8cab8] bg-[#efe6da] text-[#6c5f51]";
    }
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
        .select(
            "id, name, status, created_at, plan_interest, budget_range, goal"
        )
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
                      "id, screening_request_id, plan_type, price_amount, currency, status, created_at"
                  )
                  .in("screening_request_id", screeningIds)
                  .in("status", ["sent", "accepted"])
                  .order("created_at", { ascending: false })
            : { data: [], error: null as null | Error };

    if (offersError) {
        throw new Error(offersError.message);
    }

    const activeOfferByScreeningId = new Map(
        (offers ?? []).map((offer) => [offer.screening_request_id, offer])
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
        (orders ?? []).map((order) => [order.offer_id, order])
    );

    const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id, title, status, created_at, order_id, screening_request_id")
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
            `
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

    const latestCaseScreening = latestCase?.screening_request_id
        ? screeningRequests?.find(
              (request) => request.id === latestCase.screening_request_id
          ) ?? null
        : null;

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

    return (
        <ClientPortalShell
            eyebrow="Dashboard"
            title="Welcome"
            description="Use this page to follow your current stage, open live items, and keep track of the next meaningful step."
            counts={{
                screenings: screeningCount,
                cases: caseCount,
                reports: reportCount,
            }}
        >
            <div className="space-y-6">
                {params.screening_created === "1" ? (
                    <div className="rounded-[24px] border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                        Screening application submitted successfully.
                    </div>
                ) : null}

                {hasActionableOffer ? (
                    <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-5 py-5 shadow-[0_12px_36px_rgba(0,0,0,0.06)] md:px-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                                        Next action
                                    </p>

                                    {!paymentPaid ? (
                                        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                                            1
                                        </span>
                                    ) : null}
                                </div>

                                <h2
                                    className="text-3xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    {paymentPaid
                                        ? "Payment confirmed"
                                        : paymentPending
                                          ? "Payment pending confirmation"
                                          : "Offer available for review"}
                                </h2>

                                <p className="max-w-2xl text-sm leading-7 text-[#6e6255]">
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
                                    className="inline-flex items-center rounded-full border border-[#2c241c] px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-[#211b15] hover:text-white"
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

                <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
                    <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-4 py-4 md:px-6 md:py-5">
                        <div className="flex items-end justify-between gap-4 border-b border-[#e3d6c6] pb-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                                    Active cases
                                </p>
                                <h2
                                    className="mt-3 text-3xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    Current engagements
                                </h2>
                            </div>

                            <Link
                                href="/dashboard/cases"
                                className="text-sm text-[#6e6255] transition hover:text-[#211b15]"
                            >
                                View all
                            </Link>
                        </div>

                        {recentCases.length > 0 ? (
                            <div className="mt-2">
                                <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_150px_180px_120px] gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#8f7d68] lg:grid">
                                    <div>Case</div>
                                    <div>Date</div>
                                    <div>Selected plan</div>
                                    <div>Review focus</div>
                                    <div className="text-right">Status</div>
                                </div>

                                <div className="space-y-2">
                                    {recentCases.map((item) => {
                                        const screening = item.screening_request_id
                                            ? screeningRequests?.find(
                                                  (request) =>
                                                      request.id === item.screening_request_id
                                              ) ?? null
                                            : null;

                                        return (
                                            <article
                                                key={item.id}
                                                className="relative rounded-[22px] border border-transparent bg-white/55 px-4 py-4 transition hover:border-[#d8cab8] hover:bg-white"
                                            >
                                                <Link
                                                    href={`/dashboard/cases/${item.id}`}
                                                    className="absolute inset-0 z-10 rounded-[22px]"
                                                    aria-label={`Open ${formatClientCaseTitle(item.title)}`}
                                                />

                                                <div className="relative z-0 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.5fr)_140px_150px_180px_120px] lg:items-center lg:gap-4">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-[#211b15]">
                                                            {formatClientCaseTitle(item.title)}
                                                        </p>
                                                    </div>

                                                    <div className="text-sm text-[#6e6255]">
                                                        {formatClientDate(item.created_at)}
                                                    </div>

                                                    <div className="text-sm text-[#6e6255]">
                                                        {screening?.plan_interest
                                                            ? formatPlanLabel(screening.plan_interest)
                                                            : "—"}
                                                    </div>

                                                    <div className="truncate text-sm text-[#6e6255]">
                                                        {screening?.goal || "—"}
                                                    </div>

                                                    <div className="flex justify-start lg:justify-end">
                                                        <span
                                                            className={[
                                                                "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                                                                getSoftStatusClasses(item.status),
                                                            ].join(" ")}
                                                        >
                                                            {formatCaseStatusLabel(item.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="px-1 py-8">
                                <p
                                    className="text-2xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    No cases yet.
                                </p>
                                <p className="mt-3 max-w-xl text-sm leading-7 text-[#6e6255]">
                                    Your case will appear here after payment is confirmed and the engagement is opened.
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-4 py-4 md:px-6 md:py-5">
                        <div className="flex items-end justify-between gap-4 border-b border-[#e3d6c6] pb-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                                    Recent screenings
                                </p>
                                <h2
                                    className="mt-3 text-3xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    Screening history
                                </h2>
                            </div>

                            <Link
                                href="/dashboard/screening"
                                className="text-sm text-[#6e6255] transition hover:text-[#211b15]"
                            >
                                View all
                            </Link>
                        </div>

                        {recentScreenings.length > 0 ? (
                            <div className="mt-2">
                                <div className="hidden grid-cols-[minmax(0,1.2fr)_120px_150px_180px_120px] gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#8f7d68] lg:grid">
                                    <div>Screening</div>
                                    <div>Date</div>
                                    <div>Selected plan</div>
                                    <div>Review focus</div>
                                    <div className="text-right">Status</div>
                                </div>

                                <div className="space-y-2">
                                    {recentScreenings.map((request) => (
                                        <article
                                            key={request.id}
                                            className="relative rounded-[22px] border border-transparent bg-white/55 px-4 py-4 transition hover:border-[#d8cab8] hover:bg-white"
                                        >
                                            <Link
                                                href={`/dashboard/screening/${request.id}`}
                                                className="absolute inset-0 z-10 rounded-[22px]"
                                                aria-label={`Open ${request.name || "screening request"}`}
                                            />

                                            <div className="relative z-0 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.2fr)_120px_150px_180px_120px] lg:items-center lg:gap-4">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[#211b15]">
                                                        {request.name || "Screening request"}
                                                    </p>
                                                </div>

                                                <div className="text-sm text-[#6e6255]">
                                                    {formatClientDate(request.created_at)}
                                                </div>

                                                <div className="text-sm text-[#6e6255]">
                                                    {request.plan_interest
                                                        ? formatPlanLabel(request.plan_interest)
                                                        : "—"}
                                                </div>

                                                <div className="truncate text-sm text-[#6e6255]">
                                                    {request.goal || "—"}
                                                </div>

                                                <div className="flex justify-start lg:justify-end">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                                                            getSoftStatusClasses(request.status),
                                                        ].join(" ")}
                                                    >
                                                        {formatStatusLabel(request.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="px-1 py-8">
                                <p
                                    className="text-2xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    No screenings yet.
                                </p>
                                <p className="mt-3 max-w-xl text-sm leading-7 text-[#6e6255]">
                                    Screening is the required first step before any offer, payment, or case creation.
                                </p>
                                <div className="mt-5">
                                    <Link
                                        href="/screening"
                                        className="inline-flex items-center rounded-full border border-[#2c241c] px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-[#211b15] hover:text-white"
                                    >
                                        Apply for Screening
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {latestScreening ? (
                    <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-5 py-5 md:px-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                                    {getScreeningNextStepTitle({
                                        screeningStatus: latestScreening.status,
                                        paymentPending,
                                        paymentPaid,
                                        hasCase,
                                    })}
                                </p>

                                <h2
                                    className="text-3xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    {latestScreening.name || "Latest screening request"}
                                </h2>

                                <p className="max-w-2xl text-sm leading-7 text-[#6e6255]">
                                    {getScreeningNextStepText({
                                        screeningStatus: latestScreening.status,
                                        paymentPending,
                                        paymentPaid,
                                        hasCase,
                                    })}
                                </p>

                                <p className="text-sm leading-7 text-[#6e6255]">
                                    {getScreeningStatusHelp(latestScreening.status)}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href={`/dashboard/screening/${latestScreening.id}`}
                                    className="inline-flex items-center rounded-full border border-[#2c241c] px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-[#211b15] hover:text-white"
                                >
                                    Open Screening
                                </Link>

                                {paymentPaid && hasCase ? (
                                    <Link
                                        href="/dashboard/cases"
                                        className="inline-flex items-center rounded-full border border-[#d8cab8] bg-white/70 px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-white"
                                    >
                                        Open Cases
                                    </Link>
                                ) : null}

                                {latestOffer ? (
                                    <Link
                                        href={`/dashboard/offers/${latestOffer.id}`}
                                        className="inline-flex items-center rounded-full border border-[#d8cab8] bg-white/70 px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-white"
                                    >
                                        Offer: {formatClientReportTitle(formatPlanLabel(latestOffer.plan_type))}
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </section>
                ) : null}

                {latestReport ? (
                    <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-5 py-5 md:px-6">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                            Latest report
                        </p>

                        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                                <h2
                                    className="text-3xl leading-none text-[#211b15]"
                                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                                >
                                    {formatClientReportTitle(latestReport.title)}
                                </h2>

                                <p className="text-sm text-[#6e6255]">
                                    Published{" "}
                                    {latestReport.published_at
                                        ? formatClientDate(latestReport.published_at)
                                        : formatClientDate(latestReport.created_at)}
                                </p>

                                {latestReport.summary ? (
                                    <p className="max-w-2xl text-sm leading-7 text-[#6e6255]">
                                        {latestReport.summary}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/dashboard/reports"
                                    className="inline-flex items-center rounded-full border border-[#2c241c] px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-[#211b15] hover:text-white"
                                >
                                    Open Reports
                                </Link>

                                {latestReport.file_url ? (
                                    <a
                                        href={latestReport.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center rounded-full border border-[#d8cab8] bg-white/70 px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-white"
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