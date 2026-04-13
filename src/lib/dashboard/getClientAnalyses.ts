import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ClientAnalysisStage =
    | "request_received"
    | "accepted"
    | "offer_ready"
    | "awaiting_payment"
    | "analysis_started"
    | "analysis_in_progress"
    | "report_ready"
    | "completed"
    | "declined";

export type ClientAnalysisSummary = {
    id: string;
    title: string;
    href: string;
    planLabel: string;
    stage: ClientAnalysisStage;
    stageLabel: string;
    progressLine: string;
    contextLine: string;
    attentionLine: string;
    nextLine: string;
    hasAction: boolean;
    reportId: string | null;
    reportTitle: string | null;
    reportSummary: string | null;
    decisionLabel: string | null;
    decisionSummary: string | null;
    sortDate: string;
};

type SortableClientAnalysisSummary = ClientAnalysisSummary & {
    priority: number;
};

function formatPlanLabel(planType: string | null | undefined) {
    if (planType === "core") return "Core Analysis";
    if (planType === "strategic") return "Strategic Analysis";
    return "Analysis";
}

function stripCasePrefix(title: string | null | undefined) {
    if (!title) return null;

    return title.startsWith("Case for ")
        ? title.slice("Case for ".length)
        : title;
}

function getAnalysisTitle({
    screeningName,
    caseTitle,
}: {
    screeningName: string | null | undefined;
    caseTitle: string | null | undefined;
}) {
    return (
        stripCasePrefix(caseTitle) ||
        screeningName?.trim() ||
        "Property Analysis"
    );
}

function getDecisionLabel(value: string | null | undefined) {
    switch (value) {
        case "recommended":
            return "Recommended";
        case "watchlist":
            return "Watchlist";
        case "rejected_all":
            return "Not Recommended";
        default:
            return null;
    }
}

function getAnalysisStage(input: {
    screeningStatus: string | null | undefined;
    offerStatus: string | null | undefined;
    paymentStatus: string | null | undefined;
    caseStatus: string | null | undefined;
    hasPublishedReport: boolean;
}) {
    const {
        screeningStatus,
        offerStatus,
        paymentStatus,
        caseStatus,
        hasPublishedReport,
    } = input;

    if (screeningStatus === "rejected") {
        return {
            stage: "declined" as const,
            stageLabel: "Request Not Accepted",
            progressLine: "The request was reviewed but not accepted for further work.",
            contextLine: "This request did not move into an active analysis.",
            attentionLine: "No action is required at this stage.",
            nextLine: "A new request may be submitted if circumstances change.",
            hasAction: false,
            priority: 90,
        };
    }

    if (caseStatus === "closed") {
        return {
            stage: "completed" as const,
            stageLabel: "Completed",
            progressLine: "The analysis has concluded and all final outputs remain available.",
            contextLine: "This analysis has been completed.",
            attentionLine: "No action is required at this stage.",
            nextLine: "All final materials remain available for review.",
            hasAction: false,
            priority: 70,
        };
    }

    if (hasPublishedReport || caseStatus === "delivered") {
        return {
            stage: "report_ready" as const,
            stageLabel: "Report Ready",
            progressLine: "The final report is available and ready for review.",
            contextLine: "The analysis has reached the delivery stage.",
            attentionLine: "Review the published report.",
            nextLine: "The final conclusion and report are available below.",
            hasAction: true,
            priority: 20,
        };
    }

    if (caseStatus === "analysis") {
        return {
            stage: "analysis_in_progress" as const,
            stageLabel: "Analysis In Progress",
            progressLine: "The evaluation is underway and the core risk factors are being reviewed.",
            contextLine: "This analysis is currently in the evaluation phase.",
            attentionLine: "No action is required at this stage.",
            nextLine: "The final report will be prepared once the review is complete.",
            hasAction: false,
            priority: 30,
        };
    }

    if (caseStatus === "active") {
        return {
            stage: "analysis_started" as const,
            stageLabel: "Analysis Started",
            progressLine: "Preparation is complete and the evaluation phase is beginning.",
            contextLine: "This analysis has been opened and preparation is underway.",
            attentionLine: "No action is required at this stage.",
            nextLine: "The evaluation phase will continue and the next update will appear here.",
            hasAction: false,
            priority: 40,
        };
    }

    if (paymentStatus === "pending") {
        return {
            stage: "awaiting_payment" as const,
            stageLabel: "Awaiting Payment",
            progressLine: "The analysis is ready to begin once payment is confirmed.",
            contextLine: "Commercial acceptance is complete, but work has not started yet.",
            attentionLine: "Payment confirmation is required before the analysis can begin.",
            nextLine: "Once payment is confirmed, the analysis will move into the active phase.",
            hasAction: true,
            priority: 10,
        };
    }

    if (offerStatus === "sent") {
        return {
            stage: "offer_ready" as const,
            stageLabel: "Offer Ready",
            progressLine: "The request has been accepted and the analysis offer is ready for review.",
            contextLine: "The request has moved beyond screening and is ready for the next commercial step.",
            attentionLine: "Review the offer.",
            nextLine: "Once accepted, payment confirmation will open the analysis.",
            hasAction: true,
            priority: 5,
        };
    }

    if (screeningStatus === "accepted") {
        return {
            stage: "accepted" as const,
            stageLabel: "Accepted",
            progressLine: "The request has been accepted and the commercial step is being prepared.",
            contextLine: "The request has passed review and is moving toward formal engagement.",
            attentionLine: "No action is required at this stage.",
            nextLine: "The next update will appear once the offer is prepared.",
            hasAction: false,
            priority: 50,
        };
    }

    return {
        stage: "request_received" as const,
        stageLabel: "Request Received",
        progressLine: "The request has been received and is waiting for review.",
        contextLine: "The request is currently under initial review.",
        attentionLine: "No action is required at this stage.",
        nextLine: "The next update will appear after the review is completed.",
        hasAction: false,
        priority: 60,
    };
}

function toClientAnalysisSummary(
    item: SortableClientAnalysisSummary,
): ClientAnalysisSummary {
    return {
        id: item.id,
        title: item.title,
        href: item.href,
        planLabel: item.planLabel,
        stage: item.stage,
        stageLabel: item.stageLabel,
        progressLine: item.progressLine,
        contextLine: item.contextLine,
        attentionLine: item.attentionLine,
        nextLine: item.nextLine,
        hasAction: item.hasAction,
        reportId: item.reportId,
        reportTitle: item.reportTitle,
        reportSummary: item.reportSummary,
        decisionLabel: item.decisionLabel,
        decisionSummary: item.decisionSummary,
        sortDate: item.sortDate,
    };
}

export async function getClientAnalyses(
    supabase: ServerSupabaseClient,
    userId: string,
): Promise<ClientAnalysisSummary[]> {
    const { data: screenings, error: screeningsError } = await supabase
        .from("screening_requests")
        .select(
            "id, name, plan_interest, status, created_at, updated_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (screeningsError) {
        throw new Error(screeningsError.message);
    }

    const screeningIds = (screenings ?? []).map((item) => item.id);

    if (screeningIds.length === 0) {
        return [];
    }

    const [
        { data: offers, error: offersError },
        { data: caseRows, error: caseRowsError },
    ] = await Promise.all([
        supabase
            .from("offers")
            .select(
                "id, screening_request_id, plan_type, status, created_at",
            )
            .in("screening_request_id", screeningIds)
            .order("created_at", { ascending: false }),
        supabase
            .from("cases")
            .select(
                "id, order_id, screening_request_id, title, status, decision_status, decision_summary, created_at, updated_at",
            )
            .eq("client_id", userId)
            .order("created_at", { ascending: false }),
    ]);

    if (offersError) {
        throw new Error(offersError.message);
    }

    if (caseRowsError) {
        throw new Error(caseRowsError.message);
    }

    const offerIds = (offers ?? []).map((offer) => offer.id);

    const { data: orders, error: ordersError } =
        offerIds.length > 0
            ? await supabase
                .from("orders")
                .select("id, offer_id, payment_status, created_at, updated_at")
                .in("offer_id", offerIds)
            : { data: [], error: null as null | Error };

    if (ordersError) {
        throw new Error(ordersError.message);
    }

    const caseIds = (caseRows ?? []).map((item) => item.id);

    const { data: reports, error: reportsError } =
        caseIds.length > 0
            ? await supabase
                .from("reports")
                .select(
                    "id, case_id, title, summary, published, published_at, created_at",
                )
                .in("case_id", caseIds)
                .eq("published", true)
                .order("published_at", { ascending: false })
            : { data: [], error: null as null | Error };

    if (reportsError) {
        throw new Error(reportsError.message);
    }

    const latestOfferByScreening = new Map<string, (typeof offers)[number]>();
    for (const offer of offers ?? []) {
        if (!latestOfferByScreening.has(offer.screening_request_id)) {
            latestOfferByScreening.set(offer.screening_request_id, offer);
        }
    }

    const orderByOfferId = new Map<string, (typeof orders)[number]>();
    for (const order of orders ?? []) {
        orderByOfferId.set(order.offer_id, order);
    }

    const caseByScreeningId = new Map<string, (typeof caseRows)[number]>();
    for (const item of caseRows ?? []) {
        if (
            item.screening_request_id &&
            !caseByScreeningId.has(item.screening_request_id)
        ) {
            caseByScreeningId.set(item.screening_request_id, item);
        }
    }

    const caseByOrderId = new Map<string, (typeof caseRows)[number]>();
    for (const item of caseRows ?? []) {
        if (item.order_id && !caseByOrderId.has(item.order_id)) {
            caseByOrderId.set(item.order_id, item);
        }
    }

    const latestReportByCaseId = new Map<string, (typeof reports)[number]>();
    for (const report of reports ?? []) {
        if (!latestReportByCaseId.has(report.case_id)) {
            latestReportByCaseId.set(report.case_id, report);
        }
    }

    const analyses: SortableClientAnalysisSummary[] = (screenings ?? []).map(
        (screening) => {
            const offer = latestOfferByScreening.get(screening.id) ?? null;
            const order = offer ? orderByOfferId.get(offer.id) ?? null : null;
            const caseRow =
                caseByScreeningId.get(screening.id) ??
                (order ? caseByOrderId.get(order.id) ?? null : null);
            const report = caseRow
                ? latestReportByCaseId.get(caseRow.id) ?? null
                : null;

            const stageInfo = getAnalysisStage({
                screeningStatus: screening.status,
                offerStatus: offer?.status,
                paymentStatus: order?.payment_status,
                caseStatus: caseRow?.status,
                hasPublishedReport: !!report,
            });

            const title = getAnalysisTitle({
                screeningName: screening.name,
                caseTitle: caseRow?.title,
            });

            const planLabel = formatPlanLabel(
                offer?.plan_type ?? screening.plan_interest,
            );

            const sortDate =
                report?.published_at ||
                caseRow?.updated_at ||
                order?.updated_at ||
                offer?.created_at ||
                screening.updated_at ||
                screening.created_at;

            return {
                id: screening.id,
                title,
                href: `/dashboard/analyses/${screening.id}`,
                planLabel,
                stage: stageInfo.stage,
                stageLabel: stageInfo.stageLabel,
                progressLine: stageInfo.progressLine,
                contextLine: stageInfo.contextLine,
                attentionLine: stageInfo.attentionLine,
                nextLine: stageInfo.nextLine,
                hasAction: stageInfo.hasAction,
                reportId: report?.id ?? null,
                reportTitle: report?.title ?? null,
                reportSummary: report?.summary ?? null,
                decisionLabel: getDecisionLabel(caseRow?.decision_status),
                decisionSummary: caseRow?.decision_summary ?? null,
                sortDate,
                priority: stageInfo.priority,
            };
        },
    );

    return analyses
        .sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
        })
        .map(toClientAnalysisSummary);
}