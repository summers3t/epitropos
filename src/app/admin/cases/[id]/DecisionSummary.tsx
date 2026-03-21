type DecisionProperty = {
    id: string;
    title: string | null;
    address: string | null;
    city: string | null;
    area: string | null;
    is_primary: boolean;
    sort_order: number;
    overall_score_est: number | null;
    signal_label_est: string | null;
    roi_ltr_est: number | null;
    location_risk_level: string | null;
    liquidity_risk_level: string | null;
    renovation_risk_level: string | null;
    financing_risk_level: string | null;
    analyst_verdict: string | null;
};

function formatPropertyLabel(property: DecisionProperty) {
    return (
        property.title ||
        property.address ||
        [property.area, property.city].filter(Boolean).join(", ") ||
        "Property"
    );
}

function formatScore(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `${value}/100`;
}

function formatPercent(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `${value.toFixed(2)}%`;
}

function formatSignal(value: string | null) {
    if (!value) {
        return "—";
    }

    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatVerdict(value: string | null) {
    switch (value) {
        case "buy":
            return "Buy";
        case "buy_below_price":
            return "Buy Below Price";
        case "reject":
            return "Reject";
        default:
            return value || "—";
    }
}

function formatKeyRisks(property: DecisionProperty) {
    const risks = [
        property.location_risk_level
            ? `Location ${property.location_risk_level}`
            : null,
        property.liquidity_risk_level
            ? `Liquidity ${property.liquidity_risk_level}`
            : null,
        property.renovation_risk_level
            ? `Renovation ${property.renovation_risk_level}`
            : null,
        property.financing_risk_level
            ? `Financing ${property.financing_risk_level}`
            : null,
    ].filter(Boolean);

    if (risks.length === 0) {
        return "—";
    }

    return risks.join(" · ");
}

function getInterpretation(signal: string | null, gap: number | null) {
    if (gap !== null) {
        if (gap >= 15) {
            return "Clear lead. Decision is strong.";
        }
        if (gap >= 7) {
            return "Lead is meaningful but not dominant.";
        }
        if (gap >= 3) {
            return "Close competition. Requires attention.";
        }
        return "Very close options. Decision is fragile.";
    }

    switch (signal) {
        case "strong":
            return "Current strongest candidate.";
        case "promising":
            return "Viable candidate, but still risk-sensitive.";
        case "borderline":
            return "Decision is not clean yet.";
        case "weak":
            return "Current options do not support a confident buy decision.";
        default:
            return "No saved evaluation is complete enough for decision comparison yet.";
    }
}

function getConfidenceLabel(gap: number | null) {
    if (gap === null) {
        return "Single scored option";
    }

    if (gap >= 15) {
        return "High confidence";
    }

    if (gap >= 7) {
        return "Moderate confidence";
    }

    if (gap >= 3) {
        return "Low confidence";
    }

    return "Very low confidence";
}

export default function DecisionSummary({
    properties,
}: {
    properties: DecisionProperty[];
}) {
    const scoredProperties = properties.filter(
        (property) => property.overall_score_est !== null
    );

    const sortedByScore = [...scoredProperties].sort((a, b) => {
        if (a.overall_score_est === null) return 1;
        if (b.overall_score_est === null) return -1;
        return b.overall_score_est - a.overall_score_est;
    });

    const leadProperty = sortedByScore[0] ?? null;
    const secondProperty = sortedByScore[1] ?? null;

    const scoreGap =
        leadProperty && secondProperty
            ? (leadProperty.overall_score_est ?? 0) -
            (secondProperty.overall_score_est ?? 0)
            : null;

    const primaryProperty =
        properties.find((property) => property.is_primary) ?? null;

    const showPrimaryMismatch =
        !!leadProperty &&
        !!primaryProperty &&
        leadProperty.id !== primaryProperty.id;

    if (!leadProperty) {
        return (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Decision Summary
                        </h2>
                        <p className="mt-2 text-sm text-white/65">
                            No saved evaluation is complete enough for decision comparison yet.
                        </p>
                    </div>

                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/60">
                        Awaiting scored properties
                    </span>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Decision Summary
                    </h2>

                    <div className="mt-2 text-sm text-white/80">
                        <span className="text-white/50">Lead property: </span>
                        <span className="font-medium text-white">
                            {formatPropertyLabel(leadProperty)}
                        </span>
                    </div>

                    <div className="mt-1 text-sm text-white/65">
                        <span className="text-white/50">Second place: </span>
                        <span>
                            {secondProperty
                                ? formatPropertyLabel(secondProperty)
                                : "—"}
                        </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Second Score
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                                {secondProperty ? formatScore(secondProperty.overall_score_est) : "—"}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Score Gap
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                                {scoreGap !== null ? `+${scoreGap.toFixed(1)}` : "—"}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Confidence
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                                {getConfidenceLabel(scoreGap)}
                            </div>
                        </div>
                    </div>

                    <p className="mt-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/75">
                        {getInterpretation(leadProperty.signal_label_est, scoreGap)}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                        {leadProperty.is_primary ? "Lead is Primary" : "Lead is Not Primary"}
                    </span>

                    {showPrimaryMismatch ? (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100">
                            Primary differs from current lead
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        Score
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                        {formatScore(leadProperty.overall_score_est)}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        Signal
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                        {formatSignal(leadProperty.signal_label_est)}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        ROI (LTR)
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                        {formatPercent(leadProperty.roi_ltr_est)}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        Verdict
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                        {formatVerdict(leadProperty.analyst_verdict)}
                    </div>
                </div>

            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Key risks
                </div>
                <div className="mt-1 text-sm text-white/75">
                    {formatKeyRisks(leadProperty)}
                </div>
            </div>
        </section>
    );
}