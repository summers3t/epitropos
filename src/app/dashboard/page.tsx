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
      <div className="space-y-8">
        {primaryAnalysis ? (
          <section className="animate-fadeIn">
            {/* Main composition: Primary focus + Guidance system */}
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:gap-8 xl:items-start">

              {/* LEFT: Primary Analysis Card */}
              <div className="space-y-6">
                {/* Welcome context */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#8f7443]">
                    Current Focus
                  </p>
                  <h2 className="font-display text-[40px] leading-[0.95] text-[#081426] md:text-[52px]">
                    Welcome back.
                  </h2>
                  <p className="text-[14px] leading-7 text-[#5c564e] max-w-[600px]">
                    Follow the current stage, the next expected step, and all published deliverables from one place.
                  </p>
                </div>

                {/* Primary Card - Dominant element */}
                <Link
                  href={primaryAnalysis.href}
                  className="client-interactive client-focus-ring group relative block overflow-hidden rounded-[28px] border border-[#d7bc86]/50 bg-[rgba(255,255,255,0.82)] p-6 md:p-8 shadow-[0_20px_60px_rgba(166,139,74,0.12)] backdrop-blur-xl transition-all duration-500 hover:shadow-[0_24px_64px_rgba(15,28,46,0.08)] hover:border-[#081426]/10"
                >
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgba(201,177,139,0.03)] via-transparent to-[rgba(15,28,46,0.02)] pointer-events-none" />

                  {/* Status indicators */}
                  <div className="relative flex flex-wrap items-center gap-2 mb-6">
                    <span className="badge-gold rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]">
                      {primaryAnalysis.planLabel}
                    </span>
                    <span className="badge-muted rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]">
                      {primaryAnalysis.stageLabel}
                    </span>
                    {primaryAnalysis.hasAction && (
                      <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#8d6f3f]">
                        <span className="status-dot status-dot-pulse" />
                        Action needed
                      </span>
                    )}
                  </div>

                  <h3 className="font-display relative text-[32px] leading-[1.05] text-[#081426] md:text-[40px] transition-colors duration-300 group-hover:text-[#13243a]">
                    {primaryAnalysis.title}
                  </h3>

                  <p className="relative mt-4 max-w-[640px] text-[15px] leading-8 text-[#5c564e]">
                    {primaryAnalysis.contextLine}
                  </p>

                  {/* Hover hint */}
                  <div className="relative mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#8f7443] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span>Open analysis</span>
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              </div>

              {/* RIGHT: Guidance System - Three connected pods */}
              <div className="space-y-4 xl:pt-[72px]">
                {/* Connection line - desktop only */}
                <div className="hidden xl:block relative h-px mb-2">
                  <div className="absolute inset-0 connection-line" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#c9b18b] shadow-[0_0_12px_rgba(201,177,139,0.5)]" />
                </div>

                <div className="grid gap-3 xl:gap-4">
                  {[
                    {
                      label: "Current Stage",
                      value: primaryAnalysis.progressLine,
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                    },
                    {
                      label: "What Requires Attention Now",
                      value: primaryAnalysis.attentionLine,
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      ),
                    },
                    {
                      label: "What Comes Next",
                      value: primaryAnalysis.nextLine,
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      ),
                    },
                  ].map((pod, index) => (
                    <div 
                      key={pod.label} 
                      className={`client-glass-card group relative rounded-[20px] p-5 md:p-6 ${
                        index === 0 ? 'client-glass-active' : ''
                      } animate-fadeIn-delay-${index + 1}`}
                    >
                      {/* Top accent line for active state */}
                      {index === 0 && (
                        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#d4b06b] to-transparent" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          index === 0 
                            ? 'bg-[#f3e7d0] text-[#8d6f3f]' 
                            : 'bg-[#f8f4ec] text-[#a89b8a]'
                        }`}>
                          {pod.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8f7443]">
                            {pod.label}
                          </p>
                          <p className="mt-2 text-[13px] leading-6 text-[#4e4a43] font-light">
                            {pod.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECONDARY: Other Analyses */}
            {secondaryAnalyses.length > 0 && (
              <div className="animate-fadeIn-delay-2 pt-4">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-px flex-1 bg-gradient-to-r from-[#d7c6ab]/40 to-transparent" />
                  <h3 className="font-display text-[18px] text-[#081426] shrink-0">
                    Other Analyses
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-l from-[#d7c6ab]/40 to-transparent" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {secondaryAnalyses.map((analysis, index) => (
                    <article
                      key={analysis.id}
                      className="client-interactive client-focus-ring group relative rounded-[20px] border border-white/60 bg-white/40 p-5 backdrop-blur-xl transition-all duration-500 hover:bg-white/70 hover:border-[#c9b18b]/40 hover:shadow-[0_12px_36px_rgba(79,57,24,0.08)] animate-fadeIn-delay-3"
                      style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="badge-muted rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                              {analysis.stageLabel}
                            </span>
                          </div>

                          <h4 className="font-display text-[22px] leading-[1.1] text-[#081426] transition-colors duration-300 group-hover:text-[#13243a]">
                            {analysis.title}
                          </h4>

                          <p className="text-[13px] leading-6 text-[#5f5a51]">
                            {analysis.progressLine}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          <Link
                            href={`/dashboard?analysis=${analysis.id}`}
                            className="client-interactive inline-flex items-center justify-center rounded-full border border-[#d2bea1]/60 bg-[#fbf4e8]/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#5f584d] hover:border-[#081426]/15 hover:bg-[#f3eadc] transition-all duration-300"
                          >
                            Focus
                          </Link>

                          <Link
                            href={analysis.href}
                            className="client-interactive inline-flex items-center justify-center rounded-full border border-[#cfb894]/60 bg-[#081426] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f6ecdb] hover:bg-[#13243a] transition-all duration-300"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* Empty state */
          <section className="animate-fadeIn max-w-2xl">
            <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-white/30 p-8 md:p-12 backdrop-blur-xl">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d7c6ab]/50 to-transparent" />

              <h2 className="font-display text-[36px] leading-[1.05] text-[#081426] md:text-[44px]">
                No analyses yet.
              </h2>

              <p className="mt-4 text-[15px] leading-8 text-[#5f5a51]">
                The first analysis appears here after the initial request is submitted. Begin a screening to start your property evaluation journey.
              </p>

              <div className="mt-8">
                <Link
                  href="/screening"
                  className="client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full border border-[#cfb894] bg-[#081426] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#13243a] hover:shadow-[0_12px_28px_rgba(15,28,46,0.15)] transition-all duration-300"
                >
                  <span>Begin Screening</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}