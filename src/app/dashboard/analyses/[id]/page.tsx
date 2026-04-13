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

                    <div className="mt-6 overflow-x-auto pb-2">
                        <div className="flex min-w-max items-center gap-3">
                            {roadmap.map((step, index) => {
                                const isCurrent = step.state === "current";
                                const isComplete = step.state === "complete";

                                return (
                                    <div
                                        key={`${step.label}-${index}`}
                                        className="flex items-center gap-3"
                                    >
                                        <div
                                            className={`relative flex h-[96px] w-[168px] shrink-0 flex-col justify-center rounded-[22px] border px-4 transition duration-300 ${isCurrent
                                                ? "border-[#a68b4a]/45 bg-[rgba(166,139,74,0.14)] shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl"
                                                : isComplete
                                                    ? "border-white/12 bg-white/[0.07] shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                                                    : "border-white/8 bg-black/10"
                                                }`}
                                        >
                                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                                {index + 1}
                                            </span>

                                            <span className="mt-2 text-sm leading-6 text-white/82">
                                                {step.label}
                                            </span>

                                            {isCurrent ? (
                                                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#a68b4a] shadow-[0_0_14px_rgba(166,139,74,0.55)]" />
                                            ) : null}
                                        </div>

                                        {index < roadmap.length - 1 ? (
                                            <div className="h-px w-10 shrink-0 bg-white/12" />
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