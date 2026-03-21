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
        .select("id, screening_request_id, title, status, created_at")
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
                    Case Overview
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Check the current stage of your case, available reports, and next steps.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                            {formatCaseStatusLabel(caseItem.status)}
                        </span>

                        <div>
                            <p className="text-lg font-semibold text-white">
                                {caseItem.title || "Case"}
                            </p>
                            <p className="text-sm text-white/60">
                                Created {new Date(caseItem.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="text-sm text-white/70 md:text-right">
                        <div>
                            This section shows the current stage of your case.
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Review focus
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {screening?.goal || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Selected service
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {screening?.plan_interest || "—"}
                        </dd>
                    </div>
                </div>
            </article>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">
                    Reports
                </h2>

                <div className="mt-4 space-y-4">
                    {reports && reports.length > 0 ? (
                        reports.map((report) => (
                            <article
                                key={report.id}
                                className="rounded-2xl border border-white/10 bg-black/10 p-4"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {report.title}
                                        </p>
                                        <p className="mt-1 text-xs text-white/55">
                                            Published{" "}
                                            {report.published_at
                                                ? new Date(report.published_at).toLocaleString()
                                                : "—"}
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
                                            Report file pending
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/65">
                            No report is available for this case yet.
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}