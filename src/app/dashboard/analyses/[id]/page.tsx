import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { getClientAnalyses, type ClientAnalysisStage } from "@/lib/dashboard/getClientAnalyses";

function buildRoadmap(stage: ClientAnalysisStage) {
    const steps = [
        { key: "request_received", label: "Request Received" },
        { key: "accepted", label: "Accepted" },
        { key: "offer_ready", label: "Offer Ready" },
        { key: "awaiting_payment", label: "Payment Confirmation" },
        { key: "analysis_started", label: "Analysis Started" },
        { key: "analysis_in_progress", label: "Evaluation" },
        { key: "report_ready", label: "Report Ready" },
        { key: "completed", label: "Completed" },
    ] as const;

    const stageOrder: Record<ClientAnalysisStage, number> = {
        request_received: 0,
        accepted: 1,
        offer_ready: 2,
        awaiting_payment: 3,
        analysis_started: 4,
        analysis_in_progress: 5,
        report_ready: 6,
        completed: 7,
        declined: 0,
    };

    if (stage === "declined") {
        return [
            { label: "Request Received", state: "complete" as const },
            { label: "Reviewed", state: "current" as const },
            { label: "Not Accepted", state: "current" as const },
        ];
    }

    const currentIndex = stageOrder[stage];

    return steps.map((step, index) => ({
        label: step.label,
        state:
            index < currentIndex
                ? ("complete" as const)
                : index === currentIndex
                    ? ("current" as const)
                    : ("upcoming" as const),
    }));
}

export default async function DashboardAnalysisDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

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

    const analysis = analyses.find((item) => item.id === id);

    if (!analysis) {
        notFound();
    }

    const roadmap = buildRoadmap(analysis.stage);

    return (
        <ClientPortalShell
            eyebrow="Client Portal"
            title={analysis.title}
            description="The analysis remains organised around the current stage, the next expected step, and the final outcome once available."
            counts={counts}
            headerContent={
                <Link
                    href="/dashboard/analyses"
                    className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/10 hover:text-white"
                >
                    Back to My Analyses
                </Link>
            }
        >
            <div className="space-y-6">
                <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#a68b4a]/30 bg-[#a68b4a]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#d8c494]">
                            {analysis.planLabel}
                        </span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">
                            {analysis.stageLabel}
                        </span>
                    </div>

                    <h2
                        className="mt-4 text-4xl leading-tight text-white"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                        {analysis.title}
                    </h2>

                    <p className="mt-4 text-base leading-8 text-white/64">
                        {analysis.contextLine}
                    </p>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#a68b4a]">
                        Current Guidance
                    </p>

                    <div className="mt-5 grid gap-5 md:grid-cols-3">
                        <div className="rounded-[20px] border border-white/10 bg-black/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                Current stage
                            </div>
                            <div className="mt-2 text-lg text-white">{analysis.stageLabel}</div>
                            <p className="mt-3 text-sm leading-7 text-white/62">
                                {analysis.progressLine}
                            </p>
                        </div>

                        <div className="rounded-[20px] border border-white/10 bg-black/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                What requires attention now
                            </div>
                            <p className="mt-2 text-sm leading-7 text-white/72">
                                {analysis.attentionLine}
                            </p>
                        </div>

                        <div className="rounded-[20px] border border-white/10 bg-black/10 p-4">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                What comes next
                            </div>
                            <p className="mt-2 text-sm leading-7 text-white/72">
                                {analysis.nextLine}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#a68b4a]">
                        Journey Overview
                    </p>

                    <div className="mt-6 rounded-[24px] border border-white/8 bg-black/10 p-5 backdrop-blur-xl">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                            {roadmap.map((step, index) => {
                                const isCurrent = step.state === "current";
                                const isComplete = step.state === "complete";
                                const isUpcoming = step.state === "upcoming";

                                return (
                                    <div
                                        key={`${step.label}-${index}`}
                                        className={`group relative rounded-[20px] border px-4 py-4 transition duration-500 ${isCurrent
                                            ? "border-[#a68b4a]/40 bg-[rgba(166,139,74,0.12)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                                            : isComplete
                                                ? "border-white/12 bg-white/[0.06] hover:bg-white/[0.08]"
                                                : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tracking-[0.08em] transition duration-500 ${isCurrent
                                                    ? "animate-roadmapPulse border-[#a68b4a]/60 bg-[#a68b4a]/18 text-[#e7d4a8]"
                                                    : isComplete
                                                        ? "border-white/18 bg-white/[0.08] text-white/88"
                                                        : "border-white/10 bg-black/20 text-white/55"
                                                    }`}
                                            >
                                                {index + 1}
                                            </span>

                                            <div className="min-w-0">
                                                <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">
                                                    {isCurrent
                                                        ? "Current stage"
                                                        : isComplete
                                                            ? "Completed"
                                                            : "Upcoming"}
                                                </div>

                                                <div
                                                    className={`mt-1 text-sm leading-6 transition duration-500 ${isCurrent
                                                        ? "text-white"
                                                        : isUpcoming
                                                            ? "text-white/62"
                                                            : "text-white/78"
                                                        }`}
                                                >
                                                    {step.label}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 h-[2px] overflow-hidden rounded-full bg-white/8">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${isCurrent
                                                    ? "w-[72%] bg-[#a68b4a]"
                                                    : isComplete
                                                        ? "w-full bg-white/55"
                                                        : "w-[26%] bg-white/12"
                                                    }`}
                                            />
                                        </div>

                                        {isCurrent ? (
                                            <div className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-[#a68b4a]/28" />
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {analysis.decisionLabel || analysis.reportId ? (
                    <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 md:p-8">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#a68b4a]">
                            Final Result
                        </p>

                        {analysis.decisionLabel ? (
                            <div className="mt-4 rounded-[20px] border border-white/10 bg-black/10 p-5">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                    Conclusion
                                </div>
                                <div
                                    className="mt-2 text-3xl text-white"
                                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                >
                                    {analysis.decisionLabel}
                                </div>

                                {analysis.decisionSummary ? (
                                    <p className="mt-4 max-w-[900px] text-sm leading-7 text-white/68">
                                        {analysis.decisionSummary}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {analysis.reportId ? (
                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <a
                                    href={`/api/reports/${analysis.reportId}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-full border border-white/14 bg-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white/78 transition hover:bg-white/10 hover:text-white"
                                >
                                    Download Report
                                </a>
                            </div>
                        ) : null}
                    </section>
                ) : null}
            </div>
        </ClientPortalShell>
    );
}