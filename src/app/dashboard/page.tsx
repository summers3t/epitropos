import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { getClientAnalyses } from "@/lib/dashboard/getClientAnalyses";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const { analysis: selectedAnalysisId } = await searchParams;

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

  const primaryAnalysis =
    analyses.find((item) => item.id === selectedAnalysisId) ?? analyses[0] ?? null;

  const secondaryAnalyses = primaryAnalysis
    ? analyses.filter((item) => item.id !== primaryAnalysis.id)
    : [];

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Dashboard"
      description="The client portal focuses on the current stage, the next expected step, and the strongest point of attention right now."
      counts={counts}
    >
      <div className="space-y-6">
        <section className="client-glass-panel rounded-[28px] p-6 md:p-8">
          <p className="text-base leading-8 text-[#4f4a42]">
            Progress is steady and everything is on track. The current stage,
            the next point of attention, and the final outcome all remain visible
            in one place.
          </p>
        </section>

        {primaryAnalysis ? (
          <section className="client-glass-panel rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#d1bc96] bg-[#f3e7d0] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#8d6f3f]">
                    {primaryAnalysis.planLabel}
                  </span>
                  <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#676054]">
                    {primaryAnalysis.stageLabel}
                  </span>
                </div>

                <h2
                  className="text-4xl leading-tight text-[#1d2834] md:text-5xl"
                  style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                >
                  {primaryAnalysis.title}
                </h2>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[20px] border border-[#ddd0bc] bg-[#fbf5eb] p-4 shadow-[0_10px_26px_rgba(79,57,24,0.04)]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                      Current stage
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#4e4a43]">
                      {primaryAnalysis.progressLine}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#ddd0bc] bg-[#fbf5eb] p-4 shadow-[0_10px_26px_rgba(79,57,24,0.04)]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                      What requires attention now
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#4e4a43]">
                      {primaryAnalysis.attentionLine}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#ddd0bc] bg-[#fbf5eb] p-4 shadow-[0_10px_26px_rgba(79,57,24,0.04)]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                      What comes next
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#4e4a43]">
                      {primaryAnalysis.nextLine}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href={primaryAnalysis.href}
                  className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#0f1c2e] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#16283f] hover:text-white hover:shadow-[0_14px_32px_rgba(15,28,46,0.18)] active:bg-[#0c1727]"
                >
                  Open Analysis
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 md:p-8">
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

        {secondaryAnalyses.length > 0 ? (
          <section className="client-glass-panel rounded-[28px] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a7b48]">
                  Other Analyses
                </p>
                <p className="mt-2 text-sm leading-7 text-[#5f5a51]">
                  Additional analyses remain available below. Selecting one shifts the focus of the dashboard without losing visibility over the rest.
                </p>
              </div>

              <Link
                href="/dashboard/analyses"
                className="client-interactive client-focus-ring hidden rounded-full border border-[#d2bea1] bg-[#fbf4e8] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#5f584d] hover:border-[#0f1c2e]/20 hover:bg-[#f3eadc] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)] md:inline-flex"
              >
                View All
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {secondaryAnalyses.map((analysis) => (
                <article
                  key={analysis.id}
                  className="client-interactive rounded-[22px] border border-[#ddd0bc] bg-[#fbf5eb] p-5 shadow-[0_10px_30px_rgba(79,57,24,0.05)] hover:border-[#d0bea3] hover:bg-[#fcf7ef] hover:shadow-[0_18px_40px_rgba(79,57,24,0.08)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#676054]">
                          {analysis.stageLabel}
                        </span>
                      </div>

                      <h3
                        className="text-2xl text-[#1d2834]"
                        style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                      >
                        {analysis.title}
                      </h3>

                      <p className="text-sm leading-7 text-[#5f5a51]">
                        {analysis.progressLine}
                      </p>

                      <p className="text-sm text-[#6a655b]">
                        <span className="text-[#8a8172]">What requires attention now:</span>{" "}
                        {analysis.attentionLine}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/dashboard?analysis=${analysis.id}`}
                        className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#d2bea1] bg-[#fbf4e8] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#5f584d] hover:border-[#0f1c2e]/20 hover:bg-[#f3eadc] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)]"
                      >
                        Set as Focus
                      </Link>

                      <Link
                        href={analysis.href}
                        className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#0f1c2e] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#16283f] hover:text-white hover:shadow-[0_14px_32px_rgba(15,28,46,0.18)]"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ClientPortalShell>
  );
}