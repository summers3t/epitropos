export type TriageResult =
    | "reject"
    | "not_ready"
    | "foundation_fit"
    | "evaluation_fit"
    | "guidance_fit";

export type RecommendedPlan = "foundation" | "evaluation" | "guidance";

type DecisionPresentation = {
    badge: string;
    title: string;
    summary: string;
    nextStepTitle: string;
    nextStepBody: string;
    ctaLabel: string | null;
    ctaHref: string | null;
    tone: "neutral" | "warn" | "positive";
};

export function formatRecommendedPlan(value: string | null | undefined) {
    if (!value) return "—";
    if (value === "foundation") return "Foundation";
    if (value === "evaluation") return "Evaluation";
    if (value === "guidance") return "Guidance";
    return value;
}

export function formatTriageResult(value: string | null | undefined) {
    if (!value) return "Pending review";

    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function getDecisionPresentation({
    triageResult,
    recommendedPlan,
}: {
    triageResult: string | null | undefined;
    recommendedPlan: string | null | undefined;
}): DecisionPresentation {
    if (triageResult === "reject") {
        return {
            badge: "Not a fit right now",
            title: "At this stage, the case does not look suitable to continue.",
            summary:
                "This does not necessarily mean the broader idea is wrong. It means the current case does not yet look like a strong enough basis for paid work.",
            nextStepTitle: "What this means",
            nextStepBody:
                "If the situation changes later, you can return with a stronger budget, clearer direction, or a different property path.",
            ctaLabel: null,
            ctaHref: null,
            tone: "warn",
        };
    }

    if (triageResult === "not_ready") {
        return {
            badge: "More structure needed",
            title: "The case looks real, but it still needs a clearer working frame.",
            summary:
                "The main issue is not necessarily the desire to buy. It is that one or more critical pieces still look too loose for a confident next move.",
            nextStepTitle: "Recommended next step",
            nextStepBody:
                "Foundation is the right next layer when the case needs more structure before it makes sense to analyse specific assets in depth.",
            ctaLabel: "View Foundation",
            ctaHref: "/plans",
            tone: "neutral",
        };
    }

    if (triageResult === "foundation_fit") {
        return {
            badge: "Recommended path",
            title: "Foundation looks like the right first step for this case.",
            summary:
                "Your case shows enough signal to continue, but not yet enough clarity to jump straight into a deep property verdict.",
            nextStepTitle: "Why this recommendation",
            nextStepBody:
                "Foundation is meant to turn a loose intention into a structured path — before time and money get wasted in the wrong direction.",
            ctaLabel: "View Foundation",
            ctaHref: "/plans",
            tone: "positive",
        };
    }

    if (triageResult === "evaluation_fit") {
        return {
            badge: "Recommended path",
            title: "Evaluation looks like the right next step for this case.",
            summary:
                "The case already has enough signal for a more serious property-level judgement, rather than only general orientation.",
            nextStepTitle: "Why this recommendation",
            nextStepBody:
                "Evaluation is the right next layer when the main question is no longer whether to look — but whether a concrete property or shortlist truly makes sense.",
            ctaLabel: "View Evaluation",
            ctaHref: "/plans",
            tone: "positive",
        };
    }

    if (triageResult === "guidance_fit") {
        return {
            badge: "Recommended path",
            title: "Guidance looks like the right next step for this case.",
            summary:
                "The case appears close enough to active execution that the main value is no longer only analysis, but steadier guidance through the process.",
            nextStepTitle: "Why this recommendation",
            nextStepBody:
                "Guidance is appropriate when the risk shifts from broad uncertainty to execution risk, process friction, and deal-stage pressure.",
            ctaLabel: "View Guidance",
            ctaHref: "/plans",
            tone: "positive",
        };
    }

    if (recommendedPlan === "foundation") {
        return {
            badge: "Under review",
            title: "Your case is still under review.",
            summary:
                "A final internal recommendation has not been locked yet, but the likely next direction appears to be Foundation.",
            nextStepTitle: "Current status",
            nextStepBody:
                "You do not need to do anything for now. Once the review is complete, the next step will become visible here.",
            ctaLabel: null,
            ctaHref: null,
            tone: "neutral",
        };
    }

    if (recommendedPlan === "evaluation") {
        return {
            badge: "Under review",
            title: "Your case is still under review.",
            summary:
                "A final internal recommendation has not been locked yet, but the likely next direction appears to be Evaluation.",
            nextStepTitle: "Current status",
            nextStepBody:
                "You do not need to do anything for now. Once the review is complete, the next step will become visible here.",
            ctaLabel: null,
            ctaHref: null,
            tone: "neutral",
        };
    }

    if (recommendedPlan === "guidance") {
        return {
            badge: "Under review",
            title: "Your case is still under review.",
            summary:
                "A final internal recommendation has not been locked yet, but the likely next direction appears to be Guidance.",
            nextStepTitle: "Current status",
            nextStepBody:
                "You do not need to do anything for now. Once the review is complete, the next step will become visible here.",
            ctaLabel: null,
            ctaHref: null,
            tone: "neutral",
        };
    }

    return {
        badge: "Under review",
        title: "Your screening is currently being reviewed.",
        summary:
            "The intake has been received and is waiting for a final internal decision on the most sensible next step.",
        nextStepTitle: "Current status",
        nextStepBody:
            "For now, there is nothing you need to do. The recommendation will appear here once the review is complete.",
        ctaLabel: null,
        ctaHref: null,
        tone: "neutral",
    };
}

export function getDecisionToneClasses(
    tone: "neutral" | "warn" | "positive",
) {
    if (tone === "warn") {
        return {
            panel: "border-amber-300/20 bg-amber-500/[0.06]",
            badge: "border-amber-300/25 bg-amber-500/[0.10] text-amber-100/90",
        };
    }

    if (tone === "positive") {
        return {
            panel: "border-stone/20 bg-stone/[0.08]",
            badge: "border-stone/25 bg-stone/[0.10] text-stone",
        };
    }

    return {
        panel: "border-white/10 bg-white/[0.04]",
        badge: "border-white/15 bg-white/[0.05] text-white/70",
    };
}