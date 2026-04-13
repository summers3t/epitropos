import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { getClientAnalyses } from "@/lib/dashboard/getClientAnalyses";

export default async function DashboardAnalysesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const [counts, analyses] = await Promise.all([
        getClientPortalCounts(supabase, user.id),
        getClientAnalyses(supabase, user.id),
    ]);

    return (
        <ClientPortalShell
            eyebrow="Client Portal"
            title="My Analyses"
            description="All current and completed acquisition analyses."
            counts={counts}
        >
            <div className="space-y-4">
                {analyses.length > 0 ? (
                    analyses.map((analysis) => (
                        <article
                            key={analysis.id}
                            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-[#a68b4a]/30 bg-[#a68b4a]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#d8c494]">
                                            {analysis.planLabel}
                                        </span>
                                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                                            {analysis.stageLabel}
                                        </span>
                                    </div>

                                    <h2
                                        className="text-2xl text-white"
                                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                    >
                                        {analysis.title}
                                    </h2>

                                    <p className="max-w-[760px] text-sm leading-7 text-white/65">
                                        {analysis.progressLine}
                                    </p>

                                    <p className="text-sm text-white/55">
                                        <span className="text-white/38">What requires attention now:</span>{" "}
                                        {analysis.attentionLine}
                                    </p>

                                    <p className="text-sm text-white/55">
                                        <span className="text-white/38">What comes next:</span>{" "}
                                        {analysis.nextLine}
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    <Link
                                        href={analysis.href}
                                        className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white/78 transition duration-300 hover:bg-white/10 hover:text-white"
                                    >
                                        Open Analysis
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))
                ) : (
                    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
                        <h2
                            className="text-3xl text-white"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                            No analyses yet.
                        </h2>

                        <p className="mt-4 max-w-[760px] text-sm leading-7 text-white/62">
                            The first analysis appears here after the initial request is submitted.
                        </p>

                        <div className="mt-6">
                            <Link
                                href="/screening"
                                className="inline-flex items-center rounded-full border border-[#a68b4a]/30 bg-[#a68b4a]/10 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#dcc796] transition duration-300 hover:bg-[#a68b4a]/15"
                            >
                                Begin Screening
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </ClientPortalShell>
    );
}