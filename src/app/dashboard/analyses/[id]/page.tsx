import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { getClientAnalyses, type ClientAnalysisStage } from "@/lib/dashboard/getClientAnalyses";

type RoadmapStepState = "complete" | "current" | "upcoming";

type RoadmapStep = {
    label: string;
    state: RoadmapStepState;
    note: string;
};

function buildRoadmap(stage: ClientAnalysisStage): RoadmapStep[] {
    const steps = [
        {
            key: "request_received",
            label: "Request Received",
            note: "The request is in the queue for initial review.",
        },
        {
            key: "accepted",
            label: "Accepted",
            note: "The request passed review and is moving into formal engagement.",
        },
        {
            key: "offer_ready",
            label: "Offer Ready",
            note: "The commercial proposal is available for review.",
        },
        {
            key: "awaiting_payment",
            label: "Payment Confirmation",
            note: "The analysis is ready to open once payment is confirmed.",
        },
        {
            key: "analysis_started",
            label: "Analysis Started",
            note: "Preparation is complete and evaluation has formally opened.",
        },
        {
            key: "analysis_in_progress",
            label: "Evaluation",
            note: "The core risk, pricing, and viability factors are under review.",
        },
        {
            key: "report_ready",
            label: "Report Ready",
            note: "The final conclusion and written output are available.",
        },
        {
            key: "completed",
            label: "Completed",
            note: "The analysis is finished and all final outputs remain available.",
        },
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
        declined: 1,
    };

    if (stage === "declined") {
        return [
            {
                label: "Request Received",
                state: "complete",
                note: "The request was submitted and reviewed.",
            },
            {
                label: "Reviewed",
                state: "complete",
                note: "The request reached a formal decision point.",
            },
            {
                label: "Not Accepted",
                state: "current",
                note: "The request did not move into an active analysis.",
            },
        ];
    }

    const currentIndex = stageOrder[stage];

    return steps.map((step, index) => ({
        label: step.label,
        note: step.note,
        state:
            index < currentIndex
                ? ("complete" as const)
                : index === currentIndex
                    ? ("current" as const)
                    : ("upcoming" as const),
    }));
}

function getRoadmapSectionLabel(stage: ClientAnalysisStage) {
    if (stage === "declined") {
        return "Review Outcome";
    }

    return "Journey Overview";
}

function getRoadmapStateLabel(state: RoadmapStepState) {
    switch (state) {
        case "complete":
            return "Completed";
        case "current":
            return "Current stage";
        case "upcoming":
            return "Upcoming";
    }
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
                <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-8 xl:p-10">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#a68b4a]/30 bg-[#a68b4a]/12 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#dcc796]">
                            {analysis.planLabel}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/68">
                            {analysis.stageLabel}
                        </span>
                    </div>

                    <div className="mt-5 max-w-[980px] space-y-4">
                        <h2
                            className="text-4xl leading-[1.04] text-white md:text-[46px] xl:text-[54px]"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                            {analysis.title}
                        </h2>

                        <p className="max-w-[840px] text-[15px] leading-8 text-white/60 md:text-base">
                            {analysis.contextLine}
                        </p>
                    </div>
                </section>

                <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-8 xl:p-10">
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[24px] border border-[#a68b4a]/18 bg-[rgba(166,139,74,0.08)] p-5 md:p-6">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[#c8af74]">
                                Current Guidance
                            </p>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">
                                        Current stage
                                    </div>
                                    <div
                                        className="mt-2 text-[28px] leading-tight text-white md:text-[34px]"
                                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                    >
                                        {analysis.stageLabel}
                                    </div>
                                </div>

                                <p className="max-w-[760px] text-[15px] leading-8 text-white/72 md:text-base">
                                    {analysis.progressLine}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="rounded-[22px] border border-white/10 bg-black/10 p-5">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">
                                    What requires attention now
                                </div>
                                <p className="mt-3 text-[15px] leading-8 text-white/74">
                                    {analysis.attentionLine}
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-white/10 bg-black/10 p-5">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">
                                    What comes next
                                </div>
                                <p className="mt-3 text-[15px] leading-8 text-white/74">
                                    {analysis.nextLine}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl md:p-8 xl:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#c8af74]">
                            {getRoadmapSectionLabel(analysis.stage)}
                        </p>

                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/44">
                            {roadmap.length} stages
                        </span>
                    </div>

                    <div className="mt-8 relative">
                        <div className="absolute bottom-0 left-[19px] top-0 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.05))]" />

                        <div className="space-y-6">
                            {roadmap.map((step, index) => {
                                const isCurrent = step.state === "current";
                                const isComplete = step.state === "complete";
                                const stateLabel = getRoadmapStateLabel(step.state);

                                return (
                                    <div
                                        key={`${step.label}-${index}`}
                                        className="relative flex gap-5"
                                    >
                                        <div className="relative z-[1] pt-1">
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tracking-[0.08em] transition duration-500 ${isCurrent
                                                        ? "animate-roadmapPulse border-[#d6c08e]/55 bg-[rgba(166,139,74,0.18)] text-[#eeddb5] shadow-[0_0_0_8px_rgba(166,139,74,0.06)]"
                                                        : isComplete
                                                            ? "border-white/18 bg-white/[0.08] text-white/84"
                                                            : "border-white/10 bg-black/20 text-white/50"
                                                    }`}
                                            >
                                                {index + 1}
                                            </span>
                                        </div>

                                        <div
                                            className={`min-w-0 flex-1 border-b pb-6 ${index === roadmap.length - 1
                                                    ? "border-transparent pb-0"
                                                    : "border-white/6"
                                                }`}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${isCurrent
                                                            ? "border-[#d6c08e]/28 bg-[rgba(166,139,74,0.12)] text-[#eeddb5]"
                                                            : isComplete
                                                                ? "border-white/10 bg-white/[0.05] text-white/66"
                                                                : "border-white/8 bg-transparent text-white/38"
                                                        }`}
                                                >
                                                    {stateLabel}
                                                </span>
                                            </div>

                                            <h3
                                                className={`mt-3 text-[22px] leading-[1.2] ${isCurrent
                                                        ? "text-white"
                                                        : isComplete
                                                            ? "text-white/82"
                                                            : "text-white/56"
                                                    }`}
                                                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                            >
                                                {step.label}
                                            </h3>

                                            <p
                                                className={`mt-3 max-w-[760px] text-[15px] leading-8 ${isCurrent
                                                        ? "text-white/74"
                                                        : isComplete
                                                            ? "text-white/58"
                                                            : "text-white/42"
                                                    }`}
                                            >
                                                {step.note}
                                            </p>
                                        </div>
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