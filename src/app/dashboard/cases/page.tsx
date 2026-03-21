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
        .select("id, title, status, created_at")
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
                    Open a case to check its current stage, available reports, and next steps.
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
                                            <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                                {formatCaseStatusLabel(item.status)}
                                            </span>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {item.title || "Case"}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    Current engagement stage
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    Created {new Date(item.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end">
                                            <Link
                                                href={`/dashboard/cases/${item.id}`}
                                                className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                Open Case
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
                                Your case will appear here after payment is confirmed and the review is opened.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}