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
                    className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#d2bea1] bg-[#fbf4e8] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#5f584d] hover:border-[#0f1c2e]/20 hover:bg-[#f3eadc] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)] active:bg-[#efe3d2]"
                >
                    Back to My Analyses
                </Link>
            }
        >
            <div className="space-y-6">
                <section className="client-glass-panel rounded-[30px] p-6 md:p-8 xl:p-10">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#d1bc96] bg-[#f3e7d0] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#8d6f3f]">
                            {analysis.planLabel}
                        </span>
                        <span className="rounded-full border border-[#ddd1be] bg-[#fbf6ee] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#676054]">
                            {analysis.stageLabel}
                        </span>
                    </div>

                    <div className="mt-5 max-w-[980px] space-y-4">
                        <h2
                            className="text-4xl leading-[1.04] text-[#1d2834] md:text-[46px] xl:text-[54px]"
                            style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                        >
                            {analysis.title}
                        </h2>

                        <p className="max-w-[840px] text-[15px] leading-8 text-[#5f5a51] md:text-base">
                            {analysis.contextLine}
                        </p>
                    </div>
                </section>

                <section className="client-glass-panel rounded-[30px] p-6 md:p-8 xl:p-10">
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[24px] border border-[#d8c5a5] bg-[linear-gradient(180deg,#fbf5ea,#f1e3cc)] p-5 md:p-6">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a7b48]">
                                Current Guidance
                            </p>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                                        Current stage
                                    </div>
                                    <div
                                        className="mt-2 text-[28px] leading-tight text-[#0f1c2e] md:text-[34px]"
                                        style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                                    >
                                        {analysis.stageLabel}
                                    </div>
                                </div>

                                <p className="max-w-[760px] text-[15px] leading-8 text-[#4e4a43] md:text-base">
                                    {analysis.progressLine}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="rounded-[22px] border border-[#ddd0bc] bg-[#fbf5eb] p-5 shadow-[0_10px_30px_rgba(79,57,24,0.05)]">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                                    What requires attention now
                                </div>
                                <p className="mt-3 text-[15px] leading-8 text-[#4e4a43]">
                                    {analysis.attentionLine}
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-[#ddd0bc] bg-[#fbf5eb] p-5 shadow-[0_10px_30px_rgba(79,57,24,0.05)]">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                                    What comes next
                                </div>
                                <p className="mt-3 text-[15px] leading-8 text-[#4e4a43]">
                                    {analysis.nextLine}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="client-glass-panel overflow-hidden rounded-[30px] p-6 md:p-8 xl:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a7b48]">
                            {getRoadmapSectionLabel(analysis.stage)}
                        </p>

                        <span className="rounded-full border border-[#ddd0bc] bg-[#fbf5eb] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#766f63]">
                            {roadmap.length} stages
                        </span>
                    </div>

                    <div className="relative mt-8">
                        <div className="absolute bottom-0 left-[19px] top-0 w-px bg-[linear-gradient(180deg,rgba(15,28,46,0.18),rgba(15,28,46,0.04))]" />

                        <div className="space-y-6">
                            {roadmap.map((step, index) => {
                                const isCurrent = step.state === "current";
                                const isComplete = step.state === "complete";
                                const stateLabel = getRoadmapStateLabel(step.state);

                                return (
                                    <div
                                        key={`${step.label}-${index}`}
                                        className="client-interactive relative flex gap-5 rounded-[18px] px-2 py-1 hover:bg-[rgba(255,248,239,0.36)]"
                                    >
                                        <div className="relative z-[1] pt-1">
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tracking-[0.08em] transition duration-500 ${isCurrent
                                                    ? "animate-roadmapPulse border-[#0f1c2e]/18 bg-[#0f1c2e] text-[#f6ecdb] shadow-[0_0_0_8px_rgba(15,28,46,0.05)]"
                                                    : isComplete
                                                        ? "border-[#d2c1a6] bg-[#f3e7d1] text-[#6f5b37]"
                                                        : "border-[#ddd0bc] bg-[#fbf5eb] text-[#8a8172]"
                                                    }`}
                                            >
                                                {index + 1}
                                            </span>
                                        </div>

                                        <div
                                            className={`min-w-0 flex-1 border-b pb-6 ${index === roadmap.length - 1
                                                ? "border-transparent pb-0"
                                                : "border-[#e4d7c4]"
                                                }`}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${isCurrent
                                                        ? "border-[#0f1c2e]/12 bg-[#eef2f7] text-[#0f1c2e]"
                                                        : isComplete
                                                            ? "border-[#d2c1a6] bg-[#f3e7d1] text-[#7c6540]"
                                                            : "border-[#ddd0bc] bg-[#fbf5eb] text-[#8a8172]"
                                                        }`}
                                                >
                                                    {stateLabel}
                                                </span>
                                            </div>

                                            <h3
                                                className={`mt-3 text-[22px] leading-[1.2] ${isCurrent
                                                    ? "text-[#0f1c2e]"
                                                    : isComplete
                                                        ? "text-[#473e33]"
                                                        : "text-[#7d7468]"
                                                    }`}
                                                style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                                            >
                                                {step.label}
                                            </h3>

                                            <p
                                                className={`mt-3 max-w-[760px] text-[15px] leading-8 ${isCurrent
                                                    ? "text-[#4e4a43]"
                                                    : isComplete
                                                        ? "text-[#655f56]"
                                                        : "text-[#8a8172]"
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
                    <section className="rounded-[30px] border border-[#dccdb5] bg-[linear-gradient(180deg,rgba(252,247,241,0.96),rgba(243,233,219,0.92))] p-6 shadow-[0_20px_60px_rgba(79,57,24,0.10)] md:p-8">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a7b48]">
                            Final Result
                        </p>

                        {analysis.decisionLabel ? (
                            <div className="mt-4 rounded-[22px] border border-[#ddd0bc] bg-[#fbf5eb] p-5 shadow-[0_10px_30px_rgba(79,57,24,0.05)]">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#766f63]">
                                    Conclusion
                                </div>
                                <div
                                    className="mt-2 text-3xl text-[#0f1c2e]"
                                    style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                                >
                                    {analysis.decisionLabel}
                                </div>

                                {analysis.decisionSummary ? (
                                    <p className="mt-4 max-w-[900px] text-sm leading-7 text-[#4e4a43]">
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
                                    className="client-interactive client-focus-ring inline-flex items-center rounded-full border border-[#cfb894] bg-[#0f1c2e] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#f6ecdb] hover:bg-[#16283f] hover:text-white hover:shadow-[0_14px_32px_rgba(15,28,46,0.18)] active:bg-[#0c1727]"
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