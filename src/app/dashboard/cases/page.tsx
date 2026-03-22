import Link from "next/link";
import { redirect } from "next/navigation";
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
    if (!status || status === "pending") return null;

    const labels: Record<string, string> = {
        recommended: "Recommended",
        watchlist: "Watchlist",
        rejected_all: "Not recommended",
    };

    return labels[status] ?? null;
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

function getCaseListStatusText(status: string | null | undefined) {
    switch (status) {
        case "active":
            return "Review preparation in progress";
        case "analysis":
            return "Analysis in progress";
        case "delivered":
            return "Report available";
        case "closed":
            return "Case completed";
        default:
            return "Case in progress";
    }
}

export default async function DashboardCasesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/dashboard/cases");
    }

    const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id, title, status, created_at, decision_status")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

    if (casesError) {
        throw new Error(casesError.message);
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
                    My Cases
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Open a case to review its status, conclusion, available reports, and next step.
                </p>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="space-y-4">
                    {cases && cases.length > 0 ? (
                        cases.map((item) => {
                            return (
                                <article
                                    key={item.id}
                                    className="rounded-2xl border border-white/10 bg-black/10 p-5"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                                    {formatCaseStatusLabel(item.status)}
                                                </span>

                                                {formatDecisionStatusLabel(item.decision_status) ? (
                                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100/90">
                                                        {formatDecisionStatusLabel(item.decision_status)}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-white">
                                                    {item.title || "Case"}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {getCaseListStatusText(item.status)}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    Created {formatClientDateTime(item.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end">
                                            <Link
                                                href={`/dashboard/cases/${item.id}`}
                                                className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                View Case
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                            <p className="font-medium text-white">No cases available yet.</p>
                            <p className="mt-2 text-sm text-white/65">
                                Your case will appear here after payment is confirmed and the review begins.
                            </p>
                            <p className="mt-1 text-xs text-white/45">
                                Once available, each case will show its current status, conclusion, and report access.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}