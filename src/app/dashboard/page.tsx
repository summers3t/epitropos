import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
        analysis: "Analysis in progress",
        delivered: "Report delivered",
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
            "id, status, created_at, plan_interest, budget_range, goal"
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
        ? screeningRequests?.find((request) => request.id === latestCase.screening_request_id) ?? null
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

    return (
        <section className="space-y-8">
            <header className="max-w-3xl space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Dashboard
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-white/72">
                    Use this page to check your current stage, open active items, and access published reports.
                </p>
            </header>

            {params.screening_created === "1" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                    Screening application submitted successfully.
                </div>
            ) : null}

            {hasActionableOffer ? (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                                    Next Action
                                </p>

                                {!paymentPaid ? (
                                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                                        1
                                    </span>
                                ) : null}
                            </div>

                            <h2 className="text-xl font-semibold text-white">
                                {paymentPaid
                                    ? "Payment confirmed"
                                    : paymentPending
                                        ? "Payment pending confirmation"
                                        : "Offer available for review"}
                            </h2>

                            <p className="max-w-2xl text-sm leading-6 text-white/72">
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
                                className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                            >
                                {paymentPaid
                                    ? "Open Cases"
                                    : paymentPending
                                        ? "Open Offer Status"
                                        : "Review Offer"}
                            </Link>
                        </div>
                    </div>
                </section>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                                    My Screenings
                                </p>
                                {screeningCount > 0 ? (
                                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/85">
                                        {screeningCount}
                                    </span>
                                ) : null}
                            </div>
                            <h2 className="text-xl font-semibold">Current screening status</h2>
                        </div>

                        <Link
                            href="/dashboard/screening"
                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                        >
                            Open
                        </Link>
                    </div>

                    <div className="mt-6">
                        {latestScreening ? (
                            <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-white">
                                            Latest screening request
                                        </p>

                                        <p className="text-xs text-white/50">
                                            Submitted{" "}
                                            {new Date(latestScreening.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                            Status
                                        </div>
                                        <div className="mt-1 text-xs font-semibold tracking-[0.04em] text-white/75">
                                            {formatStatusLabel(latestScreening.status)}
                                        </div>
                                    </div>
                                </div>

                                <dl className="mt-4 grid gap-3">
                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Plan
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestScreening.plan_interest || "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Budget
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestScreening.budget_range || "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Goal
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestScreening.goal || "—"}
                                        </dd>
                                    </div>
                                </dl>

                                <p className="mt-4 text-sm leading-6 text-white/72">
                                    {getScreeningStatusHelp(latestScreening.status)}
                                </p>

                                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                                        {getScreeningNextStepTitle({
                                            screeningStatus: latestScreening.status,
                                            paymentPending,
                                            paymentPaid,
                                            hasCase,
                                        })}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-white/75">
                                        {getScreeningNextStepText({
                                            screeningStatus: latestScreening.status,
                                            paymentPending,
                                            paymentPaid,
                                            hasCase,
                                        })}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Link
                                            href={`/dashboard/screening/${latestScreening.id}`}
                                            className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                        >
                                            Open Screening
                                        </Link>

                                        {paymentPaid && hasCase ? (
                                            <Link
                                                href="/dashboard/cases"
                                                className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                Open Cases
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>

                                {latestOffer ? (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                                                        Related offer
                                                    </p>
                                                    <p className="mt-1 text-sm text-white/80">
                                                        {formatPlanLabel(latestOffer.plan_type)}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                                                        Offer status
                                                    </div>
                                                    <div className="mt-1 text-sm text-white/80">
                                                        {formatStatusLabel(latestOffer.status)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-sm text-white/75">
                                                    {latestOffer.price_amount} {latestOffer.currency}
                                                </p>

                                                <Link
                                                    href={`/dashboard/offers/${latestOffer.id}`}
                                                    className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                                >
                                                    View Offer
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <p className="font-medium text-white">
                                    No screening request yet.
                                </p>
                                <p className="mt-2 text-sm text-white/65">
                                    Start with the screening form. Screening is required before any offer, payment, or case creation.
                                </p>
                                <Link
                                    href="/screening"
                                    className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                >
                                    Apply for Screening
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                                    My Cases
                                </p>
                                {caseCount > 0 ? (
                                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/85">
                                        {caseCount}
                                    </span>
                                ) : null}
                            </div>
                            <h2 className="text-xl font-semibold">Engagement status</h2>
                        </div>

                        <Link
                            href="/dashboard/cases"
                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                        >
                            Open
                        </Link>
                    </div>

                    <div className="mt-6">
                        {latestCase ? (
                            <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-white">
                                            {formatClientCaseTitle(latestCase.title)}
                                        </p>

                                        <p className="text-xs text-white/50">
                                            Created {new Date(latestCase.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                            Status
                                        </div>
                                        <div className="mt-1 text-xs font-semibold tracking-[0.04em] text-white/75">
                                            {formatCaseStatusLabel(latestCase.status)}
                                        </div>
                                    </div>
                                </div>

                                <dl className="mt-4 grid gap-3">
                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Budget
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestCaseScreening?.budget_range || "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Goal
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestCaseScreening?.goal || "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                                            Selected service
                                        </dt>
                                        <dd className="mt-1 text-sm text-white/80">
                                            {latestCaseScreening?.plan_interest || "—"}
                                        </dd>
                                    </div>
                                </dl>
                            </article>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <p className="font-medium text-white">No cases yet.</p>
                                <p className="mt-2 text-sm text-white/65">
                                    A case appears here after your payment has been confirmed and the engagement has been opened.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                                    My Reports
                                </p>
                                {reportCount > 0 ? (
                                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white/85">
                                        {reportCount}
                                    </span>
                                ) : null}
                            </div>
                            <h2 className="text-xl font-semibold">Published deliverables</h2>
                        </div>

                        <Link
                            href="/dashboard/reports"
                            className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                        >
                            Open
                        </Link>
                    </div>

                    <div className="mt-6">
                        {latestReport ? (
                            <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-white">
                                        {formatClientReportTitle(latestReport.title)}
                                    </p>

                                    <p className="text-xs text-white/50">
                                        Published{" "}
                                        {latestReport.published_at
                                            ? new Date(latestReport.published_at).toLocaleString()
                                            : new Date(latestReport.created_at).toLocaleString()}
                                    </p>
                                </div>

                                {latestReport.summary ? (
                                    <p className="mt-4 text-sm leading-6 text-white/72">
                                        {latestReport.summary}
                                    </p>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Link
                                        href="/dashboard/reports"
                                        className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                    >
                                        Open Reports
                                    </Link>

                                    {latestReport.file_url ? (
                                        <a
                                            href={latestReport.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                        >
                                            Open Report
                                        </a>
                                    ) : null}
                                </div>
                            </article>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                <p className="font-medium text-white">
                                    No reports available yet.
                                </p>
                                <p className="mt-2 text-sm text-white/65">
                                    Published reports will appear here when they are ready.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </section>
    );
}