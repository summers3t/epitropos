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
      <div className="space-y-5">
        {primaryAnalysis ? (
          <section className="client-glass-panel relative overflow-hidden rounded-[30px] p-5 md:p-6 xl:p-7">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,248,239,0.08)_24%,rgba(239,231,216,0.18)_100%)]" />
            <div className="relative space-y-6">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.95fr] xl:items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#8f7443]">
                      Dashboard
                    </p>
                    <h2
                      className="text-[56px] leading-[0.98] text-[#081426] md:text-[64px]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      Welcome.
                    </h2>
                    <p className="max-w-[620px] text-[16px] leading-8 text-[#4f4a42]">
                      Follow the current stage, the next expected step, and all published deliverables from one place.
                    </p>
                  </div>

                  <div className="client-glass-card-active relative rounded-[30px] border border-white/70 p-7 shadow-[0_18px_44px_rgba(166,139,74,0.18)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d1bc96] bg-[#f3e7d0] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8d6f3f]">
                        {primaryAnalysis.planLabel}
                      </span>
                      <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#676054]">
                        {primaryAnalysis.stageLabel}
                      </span>
                    </div>

                    <h3
                      className="mt-5 text-[34px] leading-[1.06] text-[#081426] md:text-[42px]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {primaryAnalysis.title}
                    </h3>

                    <p className="mt-3 max-w-[540px] text-[16px] leading-8 text-[#5c564e]">
                      {primaryAnalysis.contextLine}
                    </p>
                  </div>
                </div>

                <div className="space-y-5 xl:pt-2">
                  <div className="rounded-[26px] border border-white/70 bg-white/55 px-6 py-5 shadow-[0_12px_30px_rgba(79,57,24,0.05)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[14px] leading-7 text-[#3f3b34]">
                        Progress is steady and everything is on track.
                      </p>
                      <span className="text-[13px] uppercase tracking-[0.18em] text-[#8f7443]">
                        Learn place.
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={primaryAnalysis.href}
                      className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#081426] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#f6ecdb] hover:bg-[#13243a] hover:text-white hover:shadow-[0_16px_32px_rgba(15,28,46,0.18)]"
                    >
                      Open Analysis
                    </Link>
                  </div>

                  <div className="relative grid gap-4 md:grid-cols-3 md:gap-6">
                    <div className="absolute left-[12%] right-[12%] top-[50%] hidden h-[2px] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(201,177,139,0.62),rgba(223,217,207,0.36))] md:block" />

                    {[
                      {
                        label: "Current Stage",
                        value: primaryAnalysis.progressLine,
                      },
                      {
                        label: "What Requires Attention Now",
                        value: primaryAnalysis.attentionLine,
                      },
                      {
                        label: "What Comes Next",
                        value: primaryAnalysis.nextLine,
                      },
                    ].map((pod) => (
                      <div key={pod.label} className="relative flex flex-col items-center">
                        <div className="absolute top-[22px] z-[2] hidden h-5 w-5 rounded-full border border-[#d7bc86] bg-[linear-gradient(180deg,#d9bf87,#caa561)] shadow-[0_0_14px_rgba(201,177,139,0.34)] md:block" />

                        <div className="w-full rounded-[24px] border border-white/70 bg-white/62 p-5 shadow-[0_14px_34px_rgba(79,57,24,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(79,57,24,0.09)] md:pt-8">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-[#8f7443]">
                            {pod.label}
                          </p>
                          <p className="mt-3 text-[15px] leading-7 text-[#48433b]">
                            {pod.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {secondaryAnalyses.length > 0 ? (
                <div className="border-t border-white/40 pt-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h3
                      className="text-[22px] text-[#081426]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      Other Analyses
                    </h3>

                    <Link
                      href="/dashboard/analyses"
                      className="client-interactive client-focus-ring text-[11px] uppercase tracking-[0.22em] text-[#5f584d] hover:text-[#8f7443]"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {secondaryAnalyses.map((analysis) => (
                      <article
                        key={analysis.id}
                        className="client-interactive rounded-[24px] border border-white/65 bg-white/42 p-5 shadow-[0_10px_28px_rgba(79,57,24,0.04)] backdrop-blur-lg hover:-translate-y-1 hover:bg-white/55 hover:shadow-[0_18px_40px_rgba(79,57,24,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-5">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#676054]">
                                {analysis.stageLabel}
                              </span>
                            </div>

                            <h4
                              className="text-[28px] leading-[1.1] text-[#081426]"
                              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                            >
                              {analysis.title}
                            </h4>

                            <p className="text-[14px] leading-7 text-[#5f5a51]">
                              {analysis.progressLine}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/dashboard?analysis=${analysis.id}`}
                              className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#d2bea1] bg-[#fbf4e8] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#5f584d] hover:border-[#081426]/18 hover:bg-[#f3eadc] hover:text-[#081426] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)]"
                            >
                              Set as Focus
                            </Link>

                            <Link
                              href={analysis.href}
                              className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#081426] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#13243a] hover:text-white hover:shadow-[0_14px_32px_rgba(15,28,46,0.18)]"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="client-glass-panel rounded-[30px] p-8">
            <h2
              className="text-[42px] text-[#081426]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              No analyses yet.
            </h2>

            <p className="mt-4 max-w-[760px] text-[15px] leading-8 text-[#5f5a51]">
              The first analysis appears here after the initial request is submitted.
            </p>

            <div className="mt-6">
              <Link
                href="/screening"
                className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#081426] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#f6ecdb] hover:bg-[#13243a] hover:text-white hover:shadow-[0_14px_32px_rgba(15,28,46,0.18)]"
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