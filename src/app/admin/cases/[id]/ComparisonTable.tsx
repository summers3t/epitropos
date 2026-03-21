type ComparisonProperty = {
    id: string;
    title: string | null;
    address: string | null;
    city: string | null;
    area: string | null;
    sort_order: number;
    is_primary: boolean;
    overall_score_est: number | null;
    signal_label_est: string | null;
    roi_ltr_est: number | null;
    location_risk_level: string | null;
    liquidity_risk_level: string | null;
    renovation_risk_level: string | null;
    financing_risk_level: string | null;
    analyst_verdict: string | null;
};

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

function formatPropertyLabel(property: ComparisonProperty) {
    return (
        property.title ||
        property.address ||
        [property.area, property.city].filter(Boolean).join(", ") ||
        "Property"
    );
}

function formatKeyRisks(property: ComparisonProperty) {
    const risks = [
        property.location_risk_level
            ? `Location: ${property.location_risk_level}`
            : null,
        property.liquidity_risk_level
            ? `Liquidity: ${property.liquidity_risk_level}`
            : null,
        property.renovation_risk_level
            ? `Renovation: ${property.renovation_risk_level}`
            : null,
        property.financing_risk_level
            ? `Financing: ${property.financing_risk_level}`
            : null,
    ].filter(Boolean);

    if (risks.length === 0) {
        return "—";
    }

    return risks.join(" · ");
}

function findLeadPropertyId(properties: ComparisonProperty[]) {
    const scoredProperties = properties.filter(
        (property) => property.overall_score_est !== null
    );

    if (scoredProperties.length === 0) {
        return null;
    }

    const leadProperty = scoredProperties.reduce((best, current) => {
        if (best.overall_score_est === null) {
            return current;
        }

        if (current.overall_score_est === null) {
            return best;
        }

        return current.overall_score_est > best.overall_score_est
            ? current
            : best;
    });

    return leadProperty.id;
}

export default function ComparisonTable({
    properties,
}: {
    properties: ComparisonProperty[];
}) {
    if (!properties || properties.length === 0) {
        return null;
    }

    const leadPropertyId = findLeadPropertyId(properties);

    return (
        <details className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Comparison Table
                    </h2>
                    <p className="mt-1 text-xs text-white/55">
                        {properties.length} properties · saved evaluation data only
                    </p>
                </div>

                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                    Expand
                </span>
            </summary>

            <div className="border-t border-white/10 p-6 pt-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-sm text-white/80">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-white/45">
                                <th className="border-b border-white/10 px-3 py-3">
                                    Property
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Primary
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Rank
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Score
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Signal
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    ROI (LTR)
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Key Risks
                                </th>
                                <th className="border-b border-white/10 px-3 py-3">
                                    Analyst Verdict
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {properties.map((property) => (
                                <tr
                                    key={property.id}
                                    className={
                                        property.id === leadPropertyId
                                            ? "align-top bg-emerald-500/5 text-sm text-white/80"
                                            : "align-top text-sm text-white/80"
                                    }
                                >
                                    <td className="border-b border-white/10 px-3 py-3">
                                        <div className="font-medium text-white">
                                            {formatPropertyLabel(property)}
                                            {property.id === leadPropertyId ? (
                                                <span className="ml-2 text-xs text-amber-200">
                                                    Current lead
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="mt-1 text-xs text-white/50">
                                            {[property.address, property.area, property.city]
                                                .filter(Boolean)
                                                .join(", ") || "No location details"}
                                        </div>
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {property.id === leadPropertyId ? (
                                                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100">
                                                    Lead
                                                </span>
                                            ) : null}

                                            {property.is_primary ? (
                                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                                                    Primary
                                                </span>
                                            ) : null}

                                            {property.id !== leadPropertyId && !property.is_primary ? "—" : null}
                                        </div>
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        {property.is_primary ? "—" : property.sort_order}
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        {formatScore(property.overall_score_est)}
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        {formatSignal(property.signal_label_est)}
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        {formatPercent(property.roi_ltr_est)}
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3 text-xs text-white/65">
                                        {formatKeyRisks(property)}
                                    </td>

                                    <td className="border-b border-white/10 px-3 py-3">
                                        {formatVerdict(property.analyst_verdict)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </details>
    );
}