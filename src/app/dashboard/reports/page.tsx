import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardReportsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/dashboard/reports");
    }

    const { data: reports, error } = await supabase
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

    if (error) {
        throw new Error(error.message);
    }

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/dashboard"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to dashboard
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Reports
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Open the published reports available for your cases.
                </p>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="space-y-4">
                    {reports && reports.length > 0 ? (
                        reports.map((report) => {
                            const caseTitle =
                                Array.isArray(report.cases) && report.cases.length > 0
                                    ? report.cases[0]?.title
                                    : (report.cases as { title?: string } | null)?.title;

                            return (
                                <article
                                    key={report.id}
                                    className="rounded-2xl border border-white/10 bg-black/10 p-5"
                                >
                                    <div className="space-y-2">
                                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                                            Published
                                        </span>

                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {report.title}
                                            </p>
                                            <p className="text-xs text-white/55">
                                                {caseTitle || "Client Case"}
                                            </p>
                                        </div>

                                        <div className="text-xs text-white/55">
                                            Published{" "}
                                            {report.published_at
                                                ? new Date(report.published_at)
                                                    .toISOString()
                                                    .slice(0, 10)
                                                : "—"}
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                                            {report.summary || "No summary available yet."}
                                        </div>

                                        <div className="pt-2 flex flex-wrap gap-2">
                                            <Link
                                                href={`/dashboard/cases/${report.case_id}`}
                                                className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                Open Case
                                            </Link>

                                            {report.file_url ? (
                                                <a
                                                    href={report.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                                >
                                                    Open Report
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                            <p className="font-medium text-white">No published reports yet.</p>
                            <p className="mt-2 text-sm text-white/65">
                                Published deliverables will appear here after your case work has been completed and a report is released.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}