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
    redirect("/auth/login?redirect=/dashboard/analyses");
  }

  const [counts, analyses] = await Promise.all([
    getClientPortalCounts(supabase, user.id),
    getClientAnalyses(supabase, user.id),
  ]);

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="My Analyses"
      description="All current and completed acquisition analyses in one place."
      counts={counts}
    >
      <div className="space-y-8">
        {analyses.length > 0 ? (
          <section className="space-y-4">
            {analyses.map((analysis) => (
              <article
                key={analysis.id}
                className="client-interactive rounded-[24px] border border-[#eadfca] bg-white/70 p-5 shadow-[0_18px_48px_rgba(148,119,66,0.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fffaf2]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-[#dcc79e] bg-[#fff8ea] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8b6d35]">
                        {analysis.planLabel}
                      </span>
                      <span className="inline-flex rounded-full border border-[#eadfca] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#756b59]">
                        {analysis.stageLabel}
                      </span>
                      {analysis.hasAction ? (
                        <span className="inline-flex rounded-full border border-[#d6b67a] bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#9a6a16]">
                          Action needed
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-[18px] font-semibold text-[#0f1c2e]">
                        {analysis.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-[#5f6675]">
                        {analysis.contextLine}
                      </p>
                    </div>
                  </div>

                  <div className="md:text-right">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                      Current stage
                    </div>
                    <div className="mt-1 text-[13px] leading-6 text-[#5f6675]">
                      {analysis.progressLine}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#eadfca] bg-[#fffdf8] p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                      What requires attention now
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                      {analysis.attentionLine}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfca] bg-[#fffdf8] p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                      What comes next
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                      {analysis.nextLine}
                    </p>
                  </div>

                  <div className="flex items-end justify-start md:justify-end">
                    <Link
                      href={analysis.href}
                      className="inline-flex items-center rounded-xl border border-[#dcc79e]/70 bg-white/70 px-4 py-2 text-xs text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
                    >
                      Open Analysis
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="py-8">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              No analyses yet.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              The first analysis appears after the initial request is submitted.
            </p>

            <div className="mt-5">
              <Link
                href="/readiness-check"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Start Readiness Check
              </Link>
            </div>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}