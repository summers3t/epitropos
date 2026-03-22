import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function formatDecisionStatusLabel(status: string | null | undefined) {
    if (!status) return null;

    const labels: Record<string, string> = {
        recommended: "Recommended",
        watchlist: "Watchlist",
        rejected_all: "Not recommended",
    };

    return labels[status] ?? null;
}

function getCaseStageSummary(status: string | null | undefined) {
    switch (status) {
        case "active":
            return "Your case has been opened and review preparation is in progress.";
        case "analysis":
            return "Your property analysis is currently in progress.";
        case "delivered":
            return "Your report is available and ready for review.";
        case "closed":
            return "Your case has been completed.";
        default:
            return "Your case is currently being processed.";
    }
}

function getCaseNextStep(status: string | null | undefined) {
    switch (status) {
        case "active":
            return "No action is required from you at this stage. We are preparing the review scope and materials.";
        case "analysis":
            return "We are completing the analysis. Please monitor this page for the final report and case conclusion.";
        case "delivered":
            return "Open the published report below and review the final conclusion for this case.";
        case "closed":
            return "This case is complete. Refer to your report and case conclusion if you need to revisit the outcome.";
        default:
            return "Please monitor this page for updates.";
    }
}

function getDecisionOutcomeText(status: string | null | undefined) {
    switch (status) {
        case "recommended":
            return "We recommend proceeding with this property.";
        case "watchlist":
            return "This case remains under consideration.";
        case "rejected_all":
            return "This case is not recommended for proceeding.";
        default:
            return null;
    }
}

function getDecisionSummaryFallback(status: string | null | undefined) {
    switch (status) {
        case "recommended":
            return "A final recommendation has been recorded for this case.";
        case "watchlist":
            return "This case remains on watchlist status pending further review.";
        case "rejected_all":
            return "No suitable property was approved for proceeding in this case.";
        default:
            return null;
    }
}

function getReviewFocusLabel() {
    return "Client objective";
}

function getSelectedServiceLabel() {
    return "Selected service";
}

function formatClientDateTime(value: string | null | undefined) {
    if (!value) return "—";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Sofia",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(value));

    const day = parts.find((part) => part.type === "day")?.value ?? "--";
    const month = parts.find((part) => part.type === "month")?.value ?? "--";
    const year = parts.find((part) => part.type === "year")?.value ?? "----";
    const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "--";

    return `${day}.${month}.${year} ${hour}:${minute}`;
}

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function DashboardCaseDetailPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/dashboard/cases/${id}`);
    }

    const { data: caseItem, error: caseError } = await supabase
        .from("cases")
        .select(
            "id, screening_request_id, title, status, created_at, decision_status, decision_summary, recommended_property_id"
        )
        .eq("id", id)
        .eq("client_id", user.id)
        .maybeSingle();

    if (caseError) {
        throw new Error(caseError.message);
    }

    if (!caseItem) {
        notFound();
    }

    const { data: screening, error: screeningError } = caseItem.screening_request_id
        ? await supabase
            .from("screening_requests")
            .select("id, goal, plan_interest")
            .eq("id", caseItem.screening_request_id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    const { data: properties, error: propertiesError } = await supabase
        .from("case_properties")
        .select("id, title, address")
        .eq("case_id", caseItem.id);

    if (propertiesError) {
        throw new Error(propertiesError.message);
    }

    const recommendedProperty = properties?.find(
        (property) => property.id === caseItem.recommended_property_id
    );

    const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("id, title, published, published_at, file_url")
        .eq("case_id", caseItem.id)
        .eq("published", true)
        .order("published_at", { ascending: false });

    if (reportsError) {
        throw new Error(reportsError.message);
    }

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/dashboard/cases"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to cases
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    {caseItem.title || "Case Overview"}
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Review your case status, final conclusion, published reports, and next step.
                </p>
            </div>

            {caseItem.decision_status && caseItem.decision_status !== "pending" ? (
                <section className="space-y-5 rounded-3xl border border-emerald-400/20 bg-white/5 p-6 backdrop-blur">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100">
                                Final conclusion
                            </span>

                            {formatDecisionStatusLabel(caseItem.decision_status) ? (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                                    {formatDecisionStatusLabel(caseItem.decision_status)}
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-white">
                                Case Conclusion
                            </h2>

                            {getDecisionOutcomeText(caseItem.decision_status) ? (
                                <p className="text-sm font-medium leading-6 text-white/88">
                                    {getDecisionOutcomeText(caseItem.decision_status)}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {caseItem.decision_status === "recommended" && recommendedProperty ? (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">
                            <div className="mb-1 text-xs text-white/50">
                                Selected property
                            </div>
                            <div className="font-medium">
                                {recommendedProperty.title ||
                                    recommendedProperty.address ||
                                    recommendedProperty.id}
                            </div>
                        </div>
                    ) : null}

                    {caseItem.decision_summary ? (
                        <div className="whitespace-pre-line rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-white/80">
                            {caseItem.decision_summary}
                        </div>
                    ) : getDecisionSummaryFallback(caseItem.decision_status) ? (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-white/70">
                            {getDecisionSummaryFallback(caseItem.decision_status)}
                        </div>
                    ) : null}
                </section>
            ) : null}

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                {formatCaseStatusLabel(caseItem.status)}
                            </span>
                        </div>

                        <div>
                            <p className="text-lg font-semibold text-white">
                                {caseItem.title || "Case"}
                            </p>
                            <p className="text-sm text-white/60">
                                Created {formatClientDateTime(caseItem.created_at)}
                            </p>
                        </div>
                    </div>

                    <div className="max-w-sm text-sm leading-6 text-white/70 md:text-right">
                        <div>{getCaseStageSummary(caseItem.status)}</div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/50">
                            {getReviewFocusLabel()}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-white/80">
                            {screening?.goal || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/50">
                            {getSelectedServiceLabel()}
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-white/80">
                            {screening?.plan_interest || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-emerald-100/80">
                            Next step
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-white/80">
                            {getCaseNextStep(caseItem.status)}
                        </dd>
                    </div>
                </div>
            </article>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">
                    Case Reports
                </h2>

                {reports && reports.length > 0 ? (
                    <p className="mt-2 text-sm text-white/65">
                        Open the published report for the full written analysis and supporting detail.
                    </p>
                ) : (
                    <p className="mt-2 text-sm text-white/65">
                        The written report will appear here once the analysis is complete.
                    </p>
                )}

                <div className="mt-4 space-y-4">
                    {reports && reports.length > 0 ? (
                        reports.map((report) => (
                            <article
                                key={report.id}
                                className="rounded-2xl border border-white/10 bg-black/10 p-4"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-white">
                                            {report.title}
                                        </p>
                                        <p className="text-xs text-white/55">
                                            Published {formatClientDateTime(report.published_at)}
                                        </p>
                                    </div>

                                    {report.file_url ? (
                                        <a
                                            href={report.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                        >
                                            Open Report
                                        </a>
                                    ) : (
                                        <span className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/45">
                                            Report pending
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/65">
                            No published report is available yet.
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}