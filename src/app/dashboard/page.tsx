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
      <div className="space-y-4">
        {primaryAnalysis ? (
          <section className="relative overflow-visible px-1 pb-2 pt-1">
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.38fr] xl:items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#8f7443]">
                    Dashboard
                  </p>
                  <h2
                    className="text-[48px] leading-[0.96] text-[#081426] md:text-[62px]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    Welcome.
                  </h2>
                  <p className="text-[15px] leading-7 text-[#4f4a42] xl:whitespace-nowrap">
                    Follow the current stage, the next expected step, and all published deliverables from one place.
                  </p>
                </div>

                <Link
                  href={primaryAnalysis.href}
                  className="client-interactive client-focus-ring group block rounded-[30px] border border-[#d7bc86]/70 bg-[rgba(255,255,255,0.88)] p-7 shadow-[0_22px_48px_rgba(166,139,74,0.18)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-[#081426]/18 hover:bg-[rgba(255,255,255,0.96)] hover:shadow-[0_32px_62px_rgba(15,28,46,0.16)] active:translate-y-0 active:bg-[rgba(248,242,233,0.97)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#d1bc96] bg-[#f3e7d0] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8d6f3f]">
                      {primaryAnalysis.planLabel}
                    </span>
                    <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#676054]">
                      {primaryAnalysis.stageLabel}
                    </span>
                  </div>

                  <h3
                    className="mt-5 text-[34px] leading-[1.04] text-[#081426] md:text-[42px] transition-colors duration-300 group-hover:text-[#13243a]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {primaryAnalysis.title}
                  </h3>

                  <p className="mt-3 max-w-[720px] text-[16px] leading-8 text-[#5c564e] transition-colors duration-300 group-hover:text-[#474138]">
                    {primaryAnalysis.contextLine}
                  </p>
                </Link>
              </div>

              <div className="space-y-4 xl:pt-1">
                <div className="flex justify-end">
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#d7c6ab]/72 bg-[rgba(255,255,255,0.52)] p-1.5 shadow-[0_18px_36px_rgba(79,57,24,0.08)] backdrop-blur-xl">
                    <Link
                      href="/dashboard"
                      className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#d1bb8c] bg-[#f4ead8] px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] text-[#0f1c2e] shadow-[0_8px_20px_rgba(201,177,139,0.16),inset_0_1px_0_rgba(255,255,255,0.55)]"
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/dashboard/analyses"
                      className="client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full border border-white/76 bg-white/28 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] text-[#3b3a36] hover:border-[#d1bb8c] hover:bg-white/58 hover:text-[#081426] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)]"
                    >
                      <span>My Analyses</span>
                      {counts.analyses ? (
                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full border border-[#d5c2a5] bg-[#f8efe2] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#6b5633]">
                          {counts.analyses}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                </div>

                <div className="relative xl:pt-7">
                  <div className="absolute left-[5%] right-[5%] top-[54px] hidden h-[6px] rounded-full bg-[linear-gradient(90deg,rgba(201,177,139,0.95),rgba(226,214,190,0.76),rgba(201,177,139,0.95))] shadow-[0_0_18px_rgba(201,177,139,0.24)] xl:block" />
                  <div className="absolute left-[5%] right-[5%] top-[54px] hidden h-[2px] bg-white/58 xl:block" />

                  <div className="grid gap-4 xl:grid-cols-3 xl:gap-5">
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
                        <div className="absolute top-[42px] z-[3] hidden h-7 w-7 rounded-full border border-[#d7bc86] bg-[linear-gradient(180deg,#e2cb97,#caa561)] shadow-[0_0_22px_rgba(201,177,139,0.42)] xl:block" />

                        <div className="client-interactive group relative w-full rounded-[24px] border border-white/78 bg-white/66 p-5 shadow-[0_14px_34px_rgba(79,57,24,0.05)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2.5 hover:border-[#d7bc86]/74 hover:bg-white/84 hover:shadow-[0_30px_58px_rgba(79,57,24,0.16)] xl:pt-12">
                          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                          <p className="relative text-[10px] uppercase tracking-[0.22em] text-[#8f7443]">
                            {pod.label}
                          </p>
                          <p className="relative mt-3 text-[15px] leading-8 text-[#48433b]">
                            {pod.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {secondaryAnalyses.length > 0 ? (
              <div className="pt-6">
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
                      className="client-interactive group rounded-[24px] border border-white/72 bg-white/52 p-5 shadow-[0_14px_30px_rgba(79,57,24,0.05)] backdrop-blur-lg transition-all duration-500 hover:-translate-y-2.5 hover:border-[#d0bea3] hover:bg-white/78 hover:shadow-[0_34px_62px_rgba(79,57,24,0.18)]"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#676054]">
                              {analysis.stageLabel}
                            </span>
                          </div>

                          <h4
                            className="text-[28px] leading-[1.08] text-[#081426] transition-colors duration-300 group-hover:text-[#13243a]"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                          >
                            {analysis.title}
                          </h4>

                          <p className="max-w-[560px] text-[14px] leading-7 text-[#5f5a51]">
                            {analysis.progressLine}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/dashboard?analysis=${analysis.id}`}
                            className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#d2bea1] bg-[#fbf4e8] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#5f584d] hover:border-[#081426]/18 hover:bg-[#f3eadc] hover:text-[#081426] hover:shadow-[0_12px_26px_rgba(79,57,24,0.10)]"
                          >
                            Set as Focus
                          </Link>

                          <Link
                            href={analysis.href}
                            className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#081426] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#13243a] hover:text-white hover:shadow-[0_16px_34px_rgba(15,28,46,0.20)]"
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
          </section>
        ) : (
          <section className="rounded-[30px] bg-white/30 p-8 backdrop-blur-md">
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