"use client";

import React, { useEffect, useMemo, useState } from "react";
import ComparisonTable from "./ComparisonTable";
import DecisionSummary from "./DecisionSummary";

type PropertyItem = {
    id: string;
    title: string | null;
    listing_url: string | null;
    address: string | null;
    city: string | null;
    area: string | null;
    asking_price: number | null;
    size_sqm: number | null;
    notes: string | null;
    sort_order: number;
    is_primary: boolean;
    created_at: string;

    purchase_price_est: number | null;
    renovation_cost_est: number | null;
    transaction_cost_est: number | null;
    furniture_setup_est: number | null;
    other_expenses_est: number | null;
    total_investment_est: number | null;

    expected_monthly_rent_ltr: number | null;
    str_avg_nightly_rate_est: number | null;
    occupancy_rate_str: number | null;
    monthly_costs_ltr_est: number | null;
    monthly_costs_str_est: number | null;

    annual_income_ltr_est: number | null;
    annual_income_str_est: number | null;
    gross_yield_ltr_est: number | null;
    gross_yield_str_est: number | null;
    roi_ltr_est: number | null;
    roi_str_est: number | null;

    location_score_est: number | null;
    liquidity_score_est: number | null;
    renovation_score_est: number | null;
    financing_score_est: number | null;
    building_condition_score_est: number | null;
    investment_score_est: number | null;
    overall_score_est: number | null;
    signal_label_est: string | null;
    scoring_updated_at: string | null;

    location_risk_level: string | null;
    liquidity_risk_level: string | null;
    renovation_risk_level: string | null;
    financing_risk_level: string | null;
    building_condition_level: string | null;

    risk_summary: string | null;
    building_condition_notes: string | null;
    financing_notes: string | null;
    analyst_notes: string | null;
    analyst_verdict: string | null;
};

type PropertyWorkspaceProps = {
    caseId: string;
    initialProperties: PropertyItem[];
    initialExpandedPropertyId?: string | null;
};

const inputClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35";
const textareaClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35";
const selectClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white";

function normalizeValue(value: unknown) {
    if (value === undefined || value === null) return "";
    return String(value);
}

function normalizeProperty(property: PropertyItem) {
    return {
        title: normalizeValue(property.title),
        listing_url: normalizeValue(property.listing_url),
        address: normalizeValue(property.address),
        city: normalizeValue(property.city),
        area: normalizeValue(property.area),
        asking_price: normalizeValue(property.asking_price),
        size_sqm: normalizeValue(property.size_sqm),
        notes: normalizeValue(property.notes),

        purchase_price_est: normalizeValue(property.purchase_price_est),
        renovation_cost_est: normalizeValue(property.renovation_cost_est),
        transaction_cost_est: normalizeValue(property.transaction_cost_est),
        furniture_setup_est: normalizeValue(property.furniture_setup_est),
        other_expenses_est: normalizeValue(property.other_expenses_est),
        total_investment_est: normalizeValue(property.total_investment_est),

        expected_monthly_rent_ltr: normalizeValue(property.expected_monthly_rent_ltr),
        str_avg_nightly_rate_est: normalizeValue(property.str_avg_nightly_rate_est),
        occupancy_rate_str: normalizeValue(property.occupancy_rate_str),
        monthly_costs_ltr_est: normalizeValue(property.monthly_costs_ltr_est),
        monthly_costs_str_est: normalizeValue(property.monthly_costs_str_est),

        annual_income_ltr_est: normalizeValue(property.annual_income_ltr_est),
        annual_income_str_est: normalizeValue(property.annual_income_str_est),
        gross_yield_ltr_est: normalizeValue(property.gross_yield_ltr_est),
        gross_yield_str_est: normalizeValue(property.gross_yield_str_est),
        roi_ltr_est: normalizeValue(property.roi_ltr_est),
        roi_str_est: normalizeValue(property.roi_str_est),

        location_risk_level: normalizeValue(property.location_risk_level),
        liquidity_risk_level: normalizeValue(property.liquidity_risk_level),
        renovation_risk_level: normalizeValue(property.renovation_risk_level),
        financing_risk_level: normalizeValue(property.financing_risk_level),
        building_condition_level: normalizeValue(property.building_condition_level),

        risk_summary: normalizeValue(property.risk_summary),
        building_condition_notes: normalizeValue(property.building_condition_notes),
        financing_notes: normalizeValue(property.financing_notes),
        analyst_notes: normalizeValue(property.analyst_notes),
        analyst_verdict: normalizeValue(property.analyst_verdict),
    };
}

function toNullableNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
}

function toNullableText(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function sumNullableNumbers(values: Array<number | null>) {
    const validValues = values.filter(
        (value): value is number => typeof value === "number" && !Number.isNaN(value)
    );

    if (validValues.length === 0) {
        return null;
    }

    return validValues.reduce((sum, value) => sum + value, 0);
}

function calculateTotalInvestmentFromDraft(
    draft: Record<string, string>
) {
    return sumNullableNumbers([
        toNullableNumber(draft.purchase_price_est ?? ""),
        toNullableNumber(draft.renovation_cost_est ?? ""),
        toNullableNumber(draft.transaction_cost_est ?? ""),
        toNullableNumber(draft.furniture_setup_est ?? ""),
        toNullableNumber(draft.other_expenses_est ?? ""),
    ]);
}

function formatDateDisplay(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = String(date.getUTCFullYear());

    return `${day}.${month}.${year}`;
}

function FieldLabel({
    children,
    helper,
}: {
    children: React.ReactNode;
    helper?: string;
}) {
    return (
        <div className="mb-1.5">
            <div className="text-[11px] font-medium text-white/75">{children}</div>
            {helper ? (
                <div className="mt-0.5 text-[10px] text-white/40">{helper}</div>
            ) : null}
        </div>
    );
}

function WorkspaceSection({
    title,
    defaultOpen = false,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    return (
        <details
            open={defaultOpen}
            className="rounded-xl border border-white/10 bg-white/5"
        >
            <summary className="cursor-pointer list-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white/90">{title}</div>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/60">
                        Toggle
                    </span>
                </div>
            </summary>

            <div className="border-t border-white/10 p-4">
                {children}
            </div>
        </details>
    );
}

function firstNumber(...values: Array<number | null>) {
    for (const value of values) {
        if (typeof value === "number" && !Number.isNaN(value)) {
            return value;
        }
    }

    return null;
}

function sumIfAny(values: Array<number | null>) {
    const validValues = values.filter(
        (value): value is number => typeof value === "number" && !Number.isNaN(value)
    );

    if (validValues.length === 0) {
        return null;
    }

    return validValues.reduce((sum, value) => sum + value, 0);
}

function divideOrNull(numerator: number | null, denominator: number | null) {
    if (
        numerator === null ||
        denominator === null ||
        denominator === 0 ||
        Number.isNaN(numerator) ||
        Number.isNaN(denominator)
    ) {
        return null;
    }

    return numerator / denominator;
}

function percentOrNull(numerator: number | null, denominator: number | null) {
    const ratio = divideOrNull(numerator, denominator);
    return ratio === null ? null : ratio * 100;
}

function annualizeMonthly(value: number | null) {
    return value === null ? null : value * 12;
}

function occupiedNightsPerMonth(occupancyRate: number | null) {
    if (
        occupancyRate === null ||
        Number.isNaN(occupancyRate) ||
        occupancyRate < 0
    ) {
        return null;
    }

    return 30 * (occupancyRate / 100);
}

function estimatedMonthlyStrIncome(
    nightlyRate: number | null,
    occupancyRate: number | null
) {
    const occupiedNights = occupiedNightsPerMonth(occupancyRate);

    if (
        nightlyRate === null ||
        Number.isNaN(nightlyRate) ||
        occupiedNights === null
    ) {
        return null;
    }

    return nightlyRate * occupiedNights;
}

function annualNetIncome(monthlyIncome: number | null, monthlyCosts: number | null) {
    if (monthlyIncome === null) {
        return null;
    }

    return (monthlyIncome - (monthlyCosts ?? 0)) * 12;
}

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedScore(
    parts: Array<{
        score: number | null;
        weight: number;
    }>
) {
    const validParts = parts.filter(
        (part): part is { score: number; weight: number } =>
            part.score !== null && !Number.isNaN(part.score)
    );

    if (validParts.length === 0) {
        return null;
    }

    const totalWeight = validParts.reduce((sum, part) => sum + part.weight, 0);

    if (totalWeight === 0) {
        return null;
    }

    const weightedSum = validParts.reduce(
        (sum, part) => sum + part.score * part.weight,
        0
    );

    return clampScore(weightedSum / totalWeight);
}

function riskLevelToScore(value: string) {
    switch (value) {
        case "low":
            return 90;
        case "moderate":
            return 60;
        case "high":
            return 25;
        default:
            return null;
    }
}

function buildingConditionToScore(value: string) {
    switch (value) {
        case "excellent":
            return 90;
        case "good":
            return 75;
        case "fair":
            return 50;
        case "poor":
            return 20;
        default:
            return null;
    }
}

function roiToInvestmentScore(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return null;
    }

    if (value >= 10) return 90;
    if (value >= 8) return 75;
    if (value >= 6) return 60;
    if (value >= 4) return 40;
    if (value > 0) return 20;
    return 10;
}

function formatIntegerWithSpaces(value: number) {
    const rounded = Math.round(value);
    const sign = rounded < 0 ? "-" : "";
    const digits = String(Math.abs(rounded));

    return (
        sign +
        digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    );
}

function formatCurrency(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `€${formatIntegerWithSpaces(value)}`;
}

function formatPercent(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `${value.toFixed(2)}%`;
}

function formatScore(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `${value}/100`;
}

function scoreBand(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "Insufficient data";
    }

    if (value >= 80) return "Strong";
    if (value >= 65) return "Promising";
    if (value >= 50) return "Borderline";
    return "Weak";
}

function formatAnalystVerdict(value: string) {
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

function toDraftNumberString(value: number | null) {
    return value === null || Number.isNaN(value) ? "" : String(value);
}

function calculateInvestmentMetricsFromDraft(draft: Record<string, string>) {
    const totalInvestment = toNullableNumber(draft.total_investment_est ?? "");
    const expectedMonthlyRentLtr = toNullableNumber(
        draft.expected_monthly_rent_ltr ?? ""
    );
    const strAvgNightlyRate = toNullableNumber(
        draft.str_avg_nightly_rate_est ?? ""
    );
    const occupancyRateStr = toNullableNumber(draft.occupancy_rate_str ?? "");
    const monthlyCostsLtrEst = toNullableNumber(draft.monthly_costs_ltr_est ?? "");
    const monthlyCostsStrEst = toNullableNumber(draft.monthly_costs_str_est ?? "");

    const monthlyIncomeStr = estimatedMonthlyStrIncome(
        strAvgNightlyRate,
        occupancyRateStr
    );

    const annualIncomeLtr = annualizeMonthly(expectedMonthlyRentLtr);
    const annualIncomeStr = annualizeMonthly(monthlyIncomeStr);

    const annualNetIncomeLtr = annualNetIncome(
        expectedMonthlyRentLtr,
        monthlyCostsLtrEst
    );
    const annualNetIncomeStr = annualNetIncome(
        monthlyIncomeStr,
        monthlyCostsStrEst
    );

    const grossYieldLtr = percentOrNull(annualIncomeLtr, totalInvestment);
    const grossYieldStr = percentOrNull(annualIncomeStr, totalInvestment);
    const roiLtr = percentOrNull(annualNetIncomeLtr, totalInvestment);
    const roiStr = percentOrNull(annualNetIncomeStr, totalInvestment);

    return {
        annual_income_ltr_est: toDraftNumberString(annualIncomeLtr),
        annual_income_str_est: toDraftNumberString(annualIncomeStr),
        gross_yield_ltr_est: toDraftNumberString(grossYieldLtr),
        gross_yield_str_est: toDraftNumberString(grossYieldStr),
        roi_ltr_est: toDraftNumberString(roiLtr),
        roi_str_est: toDraftNumberString(roiStr),
    };
}

export default function PropertyWorkspace({
    caseId,
    initialProperties,
    initialExpandedPropertyId = null,
}: PropertyWorkspaceProps) {
    const initialNormalizedById = useMemo(() => {
        return Object.fromEntries(
            initialProperties.map((property) => [property.id, normalizeProperty(property)])
        );
    }, [initialProperties]);

    const [properties, setProperties] = useState(initialProperties);
    const [baselineById, setBaselineById] = useState(initialNormalizedById);
    const [draftsById, setDraftsById] = useState(initialNormalizedById);
    const [savingById, setSavingById] = useState<Record<string, boolean>>({});
    const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});
    const [reorderingById, setReorderingById] = useState<Record<string, boolean>>({});
    const [settingPrimaryById, setSettingPrimaryById] = useState<Record<string, boolean>>({});
    const [savedById, setSavedById] = useState<Record<string, boolean>>({});
    const [errorById, setErrorById] = useState<Record<string, string | null>>({});
    const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(
        initialExpandedPropertyId
    );

    useEffect(() => {
        setProperties(initialProperties);
        setBaselineById(initialNormalizedById);
        setDraftsById(initialNormalizedById);
    }, [initialProperties, initialNormalizedById]);

    const hasAnyUnsavedChanges = useMemo(() => {
        return properties.some((property) => {
            const propertyId = property.id;
            return (
                JSON.stringify(draftsById[propertyId]) !==
                JSON.stringify(baselineById[propertyId])
            );
        });
    }, [baselineById, draftsById, properties]);

    useEffect(() => {
        if (!initialExpandedPropertyId) {
            return;
        }

        setExpandedPropertyId(initialExpandedPropertyId);
    }, [initialExpandedPropertyId]);

    function updateField(propertyId: string, field: string, value: string) {
        setDraftsById((current) => {
            const nextDraft = {
                ...current[propertyId],
                [field]: value,
            };

            const acquisitionFields = [
                "purchase_price_est",
                "renovation_cost_est",
                "transaction_cost_est",
                "furniture_setup_est",
                "other_expenses_est",
            ];

            const metricDriverFields = [
                "purchase_price_est",
                "renovation_cost_est",
                "transaction_cost_est",
                "furniture_setup_est",
                "other_expenses_est",
                "expected_monthly_rent_ltr",
                "str_avg_nightly_rate_est",
                "occupancy_rate_str",
                "monthly_costs_ltr_est",
                "monthly_costs_str_est",
            ];

            if (acquisitionFields.includes(field)) {
                const computedTotal = calculateTotalInvestmentFromDraft(nextDraft);
                nextDraft.total_investment_est =
                    computedTotal === null ? "" : String(computedTotal);
            }

            if (metricDriverFields.includes(field)) {
                Object.assign(
                    nextDraft,
                    calculateInvestmentMetricsFromDraft(nextDraft)
                );
            }

            return {
                ...current,
                [propertyId]: nextDraft,
            };
        });

        setSavedById((current) => ({
            ...current,
            [propertyId]: false,
        }));

        setErrorById((current) => ({
            ...current,
            [propertyId]: null,
        }));
    }

    function isDirty(propertyId: string) {
        return (
            JSON.stringify(draftsById[propertyId]) !==
            JSON.stringify(baselineById[propertyId])
        );
    }

    useEffect(() => {
        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!hasAnyUnsavedChanges) {
                return;
            }

            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasAnyUnsavedChanges]);

    function attemptCollapse(propertyId: string) {
        if (isDirty(propertyId)) {
            const shouldDiscard = window.confirm(
                "You have unsaved changes for this property. Collapse anyway and keep changes only locally until you save?"
            );

            if (!shouldDiscard) {
                return;
            }
        }

        const propertyElement = document.getElementById(`property-${propertyId}`);
        const nextScrollTop =
            propertyElement !== null
                ? window.scrollY + propertyElement.getBoundingClientRect().top - 24
                : null;

        setExpandedPropertyId(null);

        if (nextScrollTop !== null) {
            window.requestAnimationFrame(() => {
                window.scrollTo({
                    top: Math.max(0, nextScrollTop),
                    behavior: "auto",
                });
            });
        }
    }

    async function saveProperty(propertyId: string) {
        const draft = draftsById[propertyId];

        setSavingById((current) => ({ ...current, [propertyId]: true }));
        setErrorById((current) => ({ ...current, [propertyId]: null }));
        setSavedById((current) => ({ ...current, [propertyId]: false }));

        const payload = {
            title: toNullableText(draft.title),
            listing_url: toNullableText(draft.listing_url),
            address: toNullableText(draft.address),
            city: toNullableText(draft.city),
            area: toNullableText(draft.area),
            asking_price: toNullableNumber(draft.asking_price),
            size_sqm: toNullableNumber(draft.size_sqm),
            notes: toNullableText(draft.notes),

            purchase_price_est: toNullableNumber(draft.purchase_price_est),
            renovation_cost_est: toNullableNumber(draft.renovation_cost_est),
            transaction_cost_est: toNullableNumber(draft.transaction_cost_est),
            furniture_setup_est: toNullableNumber(draft.furniture_setup_est),
            other_expenses_est: toNullableNumber(draft.other_expenses_est),
            total_investment_est: toNullableNumber(draft.total_investment_est),

            expected_monthly_rent_ltr: toNullableNumber(draft.expected_monthly_rent_ltr),
            str_avg_nightly_rate_est: toNullableNumber(draft.str_avg_nightly_rate_est),
            occupancy_rate_str: toNullableNumber(draft.occupancy_rate_str),
            monthly_costs_ltr_est: toNullableNumber(draft.monthly_costs_ltr_est),
            monthly_costs_str_est: toNullableNumber(draft.monthly_costs_str_est),

            annual_income_ltr_est: toNullableNumber(draft.annual_income_ltr_est),
            annual_income_str_est: toNullableNumber(draft.annual_income_str_est),
            gross_yield_ltr_est: toNullableNumber(draft.gross_yield_ltr_est),
            gross_yield_str_est: toNullableNumber(draft.gross_yield_str_est),
            roi_ltr_est: toNullableNumber(draft.roi_ltr_est),
            roi_str_est: toNullableNumber(draft.roi_str_est),

            location_risk_level: toNullableText(draft.location_risk_level),
            liquidity_risk_level: toNullableText(draft.liquidity_risk_level),
            renovation_risk_level: toNullableText(draft.renovation_risk_level),
            financing_risk_level: toNullableText(draft.financing_risk_level),
            building_condition_level: toNullableText(draft.building_condition_level),

            risk_summary: toNullableText(draft.risk_summary),
            building_condition_notes: toNullableText(draft.building_condition_notes),
            financing_notes: toNullableText(draft.financing_notes),
            analyst_notes: toNullableText(draft.analyst_notes),
            analyst_verdict: toNullableText(draft.analyst_verdict),
        };

        try {
            const response = await fetch(`/api/case-properties/${propertyId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Save failed.");
            }

            const previewLocationScore = riskLevelToScore(draft.location_risk_level);
            const previewLiquidityScore = riskLevelToScore(draft.liquidity_risk_level);
            const previewRenovationScore = riskLevelToScore(draft.renovation_risk_level);
            const previewFinancingScore = riskLevelToScore(draft.financing_risk_level);
            const previewBuildingConditionScore = buildingConditionToScore(
                draft.building_condition_level
            );
            const previewInvestmentScore = roiToInvestmentScore(
                firstNumber(
                    toNullableNumber(draft.roi_ltr_est),
                    toNullableNumber(draft.roi_str_est)
                )
            );
            const previewOverallScore = weightedScore([
                { score: previewLocationScore, weight: 25 },
                { score: previewLiquidityScore, weight: 20 },
                { score: previewRenovationScore, weight: 15 },
                { score: previewFinancingScore, weight: 15 },
                { score: previewBuildingConditionScore, weight: 10 },
                { score: previewInvestmentScore, weight: 15 },
            ]);

            setBaselineById((current) => ({
                ...current,
                [propertyId]: { ...draft },
            }));

            setProperties((current) =>
                current.map((item) =>
                    item.id === propertyId
                        ? {
                            ...item,
                            title: payload.title,
                            listing_url: payload.listing_url,
                            address: payload.address,
                            city: payload.city,
                            area: payload.area,
                            asking_price: payload.asking_price,
                            size_sqm: payload.size_sqm,
                            notes: payload.notes,
                            purchase_price_est: payload.purchase_price_est,
                            renovation_cost_est: payload.renovation_cost_est,
                            transaction_cost_est: payload.transaction_cost_est,
                            furniture_setup_est: payload.furniture_setup_est,
                            other_expenses_est: payload.other_expenses_est,
                            total_investment_est: payload.total_investment_est,
                            expected_monthly_rent_ltr: payload.expected_monthly_rent_ltr,
                            str_avg_nightly_rate_est: payload.str_avg_nightly_rate_est,
                            occupancy_rate_str: payload.occupancy_rate_str,
                            monthly_costs_ltr_est: payload.monthly_costs_ltr_est,
                            monthly_costs_str_est: payload.monthly_costs_str_est,
                            annual_income_ltr_est: payload.annual_income_ltr_est,
                            annual_income_str_est: payload.annual_income_str_est,
                            gross_yield_ltr_est: payload.gross_yield_ltr_est,
                            gross_yield_str_est: payload.gross_yield_str_est,
                            roi_ltr_est: payload.roi_ltr_est,
                            roi_str_est: payload.roi_str_est,
                            location_risk_level: payload.location_risk_level,
                            liquidity_risk_level: payload.liquidity_risk_level,
                            renovation_risk_level: payload.renovation_risk_level,
                            financing_risk_level: payload.financing_risk_level,
                            building_condition_level: payload.building_condition_level,
                            risk_summary: payload.risk_summary,
                            building_condition_notes: payload.building_condition_notes,
                            financing_notes: payload.financing_notes,
                            analyst_notes: payload.analyst_notes,
                            analyst_verdict: payload.analyst_verdict,
                            location_score_est: previewLocationScore,
                            liquidity_score_est: previewLiquidityScore,
                            renovation_score_est: previewRenovationScore,
                            financing_score_est: previewFinancingScore,
                            building_condition_score_est: previewBuildingConditionScore,
                            investment_score_est: previewInvestmentScore,
                            overall_score_est: previewOverallScore,
                            signal_label_est:
                                previewOverallScore === null
                                    ? "insufficient_data"
                                    : previewOverallScore >= 80
                                        ? "strong"
                                        : previewOverallScore >= 65
                                            ? "promising"
                                            : previewOverallScore >= 50
                                                ? "borderline"
                                                : "weak",
                            scoring_updated_at: new Date().toISOString(),
                        }
                        : item
                )
            );

            setSavedById((current) => ({ ...current, [propertyId]: true }));

            window.setTimeout(() => {
                setSavedById((current) => ({ ...current, [propertyId]: false }));
            }, 1500);
        } catch (error) {
            setErrorById((current) => ({
                ...current,
                [propertyId]:
                    error instanceof Error ? error.message : "Unexpected save error.",
            }));
        } finally {
            setSavingById((current) => ({ ...current, [propertyId]: false }));
        }
    }

    async function deleteProperty(propertyId: string) {
        const hasUnsavedChanges = isDirty(propertyId);

        const shouldDelete = window.confirm(
            hasUnsavedChanges
                ? "This property has unsaved changes. Delete it anyway? This cannot be undone."
                : "Delete this property from the case? This cannot be undone."
        );

        if (!shouldDelete) {
            return;
        }

        setDeletingById((current) => ({ ...current, [propertyId]: true }));
        setErrorById((current) => ({ ...current, [propertyId]: null }));

        try {
            const response = await fetch(`/api/case-properties/${propertyId}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Delete failed.");
            }

            window.location.href = `/admin/cases/${caseId}#properties-list`;
        } catch (error) {
            setErrorById((current) => ({
                ...current,
                [propertyId]:
                    error instanceof Error ? error.message : "Unexpected delete error.",
            }));
        } finally {
            setDeletingById((current) => ({ ...current, [propertyId]: false }));
        }
    }

    function blockPriorityActions(propertyId: string) {
        if (!hasAnyUnsavedChanges) {
            return false;
        }

        setErrorById((current) => ({
            ...current,
            [propertyId]:
                "Save or delete all unsaved property changes before reordering or changing the primary property.",
        }));

        return true;
    }

    async function reorderProperty(propertyId: string, direction: "up" | "down") {
        if (blockPriorityActions(propertyId)) {
            return;
        }

        setReorderingById((current) => ({ ...current, [propertyId]: true }));
        setErrorById((current) => ({ ...current, [propertyId]: null }));

        try {
            const response = await fetch(`/api/case-properties/${propertyId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: direction === "up" ? "move_up" : "move_down",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Reorder failed.");
            }

            setProperties((current) => {
                const currentIndex = current.findIndex((item) => item.id === propertyId);

                if (currentIndex === -1) {
                    return current;
                }

                const visibleGroup = current.filter((item) => !item.is_primary);
                const groupIndex = visibleGroup.findIndex((item) => item.id === propertyId);

                if (groupIndex === -1) {
                    return current;
                }

                const siblingInGroup =
                    direction === "up"
                        ? visibleGroup[groupIndex - 1] ?? null
                        : visibleGroup[groupIndex + 1] ?? null;

                if (!siblingInGroup) {
                    return current;
                }

                return current
                    .map((item) => {
                        if (item.id === propertyId) {
                            return { ...item, sort_order: siblingInGroup.sort_order };
                        }

                        if (item.id === siblingInGroup.id) {
                            const currentItem = current[currentIndex];
                            return { ...item, sort_order: currentItem.sort_order };
                        }

                        return item;
                    })
                    .sort((a, b) => {
                        if (a.is_primary !== b.is_primary) {
                            return a.is_primary ? -1 : 1;
                        }

                        if (a.sort_order !== b.sort_order) {
                            return a.sort_order - b.sort_order;
                        }

                        return a.created_at.localeCompare(b.created_at);
                    });
            });
        } catch (error) {
            setErrorById((current) => ({
                ...current,
                [propertyId]:
                    error instanceof Error ? error.message : "Unexpected reorder error.",
            }));
        } finally {
            setReorderingById((current) => ({ ...current, [propertyId]: false }));
        }
    }

    async function setPrimaryProperty(propertyId: string) {
        if (blockPriorityActions(propertyId)) {
            return;
        }

        setSettingPrimaryById((current) => ({ ...current, [propertyId]: true }));
        setErrorById((current) => ({ ...current, [propertyId]: null }));

        try {
            const response = await fetch(`/api/case-properties/${propertyId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "set_primary",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Primary update failed.");
            }

            setProperties((current) =>
                current
                    .map((item) => ({
                        ...item,
                        is_primary: item.id === propertyId,
                    }))
                    .sort((a, b) => {
                        if (a.is_primary !== b.is_primary) {
                            return a.is_primary ? -1 : 1;
                        }

                        if (a.sort_order !== b.sort_order) {
                            return a.sort_order - b.sort_order;
                        }

                        return a.created_at.localeCompare(b.created_at);
                    })
            );
        } catch (error) {
            setErrorById((current) => ({
                ...current,
                [propertyId]:
                    error instanceof Error
                        ? error.message
                        : "Unexpected primary update error.",
            }));
        } finally {
            setSettingPrimaryById((current) => ({
                ...current,
                [propertyId]: false,
            }));
        }
    }

    return (
        <div id="properties-list" className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4 md:p-5">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/80">
                        Decision Surface
                    </h3>
                    <p className="text-xs text-white/45">
                        Lead, confidence, and saved comparison view for the current case.
                    </p>
                </div>

                <DecisionSummary properties={properties} />
                <ComparisonTable properties={properties} />
            </section>

            {properties.length > 0 ? (
                properties.map((p) => {
                    const draft = draftsById[p.id];
                    const dirty = isDirty(p.id);
                    const saving = !!savingById[p.id];
                    const deleting = !!deletingById[p.id];
                    const reordering = !!reorderingById[p.id];
                    const settingPrimary = !!settingPrimaryById[p.id];
                    const busy = saving || deleting || reordering || settingPrimary;
                    const saved = !!savedById[p.id];
                    const error = errorById[p.id];
                    const isOpen = expandedPropertyId === p.id;

                    const nonPrimaryProperties = properties.filter(
                        (item) => !item.is_primary
                    );
                    const nonPrimaryIndex = nonPrimaryProperties.findIndex(
                        (item) => item.id === p.id
                    );
                    const displayRank =
                        p.is_primary || nonPrimaryIndex === -1
                            ? null
                            : nonPrimaryIndex + 1;

                    const isFirstNonPrimary = nonPrimaryIndex === 0;
                    const isLastNonPrimary =
                        nonPrimaryIndex === nonPrimaryProperties.length - 1;

                    const purchasePriceEst = toNullableNumber(draft.purchase_price_est);
                    const renovationCostEst = toNullableNumber(draft.renovation_cost_est);
                    const transactionCostEst = toNullableNumber(draft.transaction_cost_est);
                    const furnitureSetupEst = toNullableNumber(draft.furniture_setup_est);
                    const otherExpensesEst = toNullableNumber(draft.other_expenses_est);
                    const totalInvestmentPreview = toNullableNumber(draft.total_investment_est);

                    const expectedMonthlyRentLtr = toNullableNumber(
                        draft.expected_monthly_rent_ltr
                    );
                    const strAvgNightlyRate = toNullableNumber(
                        draft.str_avg_nightly_rate_est
                    );
                    const occupancyRateStr = toNullableNumber(
                        draft.occupancy_rate_str
                    );
                    const monthlyCostsLtrEst = toNullableNumber(
                        draft.monthly_costs_ltr_est
                    );
                    const monthlyCostsStrEst = toNullableNumber(
                        draft.monthly_costs_str_est
                    );

                    const annualIncomeLtrPreview = toNullableNumber(
                        draft.annual_income_ltr_est
                    );
                    const annualIncomeStrPreview = toNullableNumber(
                        draft.annual_income_str_est
                    );

                    const estimatedOccupiedNightsStrPreview = occupiedNightsPerMonth(
                        occupancyRateStr
                    );

                    const estimatedMonthlyIncomeStrPreview = estimatedMonthlyStrIncome(
                        strAvgNightlyRate,
                        occupancyRateStr
                    );

                    const annualNetIncomeLtrPreview = annualNetIncome(
                        expectedMonthlyRentLtr,
                        monthlyCostsLtrEst
                    );
                    const annualNetIncomeStrPreview = annualNetIncome(
                        estimatedMonthlyIncomeStrPreview,
                        monthlyCostsStrEst
                    );

                    const grossYieldLtrPreview = toNullableNumber(
                        draft.gross_yield_ltr_est
                    );
                    const grossYieldStrPreview = toNullableNumber(
                        draft.gross_yield_str_est
                    );

                    const roiLtrPreview = toNullableNumber(draft.roi_ltr_est);
                    const roiStrPreview = toNullableNumber(draft.roi_str_est);

                    const previewLocationScore = riskLevelToScore(draft.location_risk_level);
                    const previewLiquidityScore = riskLevelToScore(draft.liquidity_risk_level);
                    const previewRenovationScore = riskLevelToScore(draft.renovation_risk_level);
                    const previewFinancingScore = riskLevelToScore(draft.financing_risk_level);
                    const previewBuildingConditionScore = buildingConditionToScore(
                        draft.building_condition_level
                    );

                    const conservativeReturnBasis = firstNumber(
                        roiLtrPreview,
                        roiStrPreview
                    );
                    const previewInvestmentScore = roiToInvestmentScore(
                        conservativeReturnBasis
                    );

                    const previewOverallScore = weightedScore([
                        { score: previewLocationScore, weight: 25 },
                        { score: previewLiquidityScore, weight: 20 },
                        { score: previewRenovationScore, weight: 15 },
                        { score: previewFinancingScore, weight: 15 },
                        { score: previewBuildingConditionScore, weight: 10 },
                        { score: previewInvestmentScore, weight: 15 },
                    ]);

                    const displayedLocationScore =
                        p.location_score_est ?? previewLocationScore;
                    const displayedLiquidityScore =
                        p.liquidity_score_est ?? previewLiquidityScore;
                    const displayedRenovationScore =
                        p.renovation_score_est ?? previewRenovationScore;
                    const displayedFinancingScore =
                        p.financing_score_est ?? previewFinancingScore;
                    const displayedBuildingConditionScore =
                        p.building_condition_score_est ?? previewBuildingConditionScore;
                    const displayedInvestmentScore =
                        p.investment_score_est ?? previewInvestmentScore;
                    const displayedOverallScore =
                        p.overall_score_est ?? previewOverallScore;
                    const displayedSignal =
                        p.signal_label_est
                            ? p.signal_label_est
                                .split("_")
                                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                                .join(" ")
                            : scoreBand(previewOverallScore);

                    return (
                        <details
                            key={p.id}
                            id={`property-${p.id}`}
                            open={isOpen}
                            className={
                                p.is_primary
                                    ? "rounded-xl border border-emerald-400/30 bg-emerald-500/5 text-sm shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
                                    : "rounded-xl border border-white/10 bg-black/10 text-sm opacity-95"
                            }
                        >
                            <summary
                                className="cursor-pointer list-none p-5"
                                onClick={(event) => {
                                    event.preventDefault();

                                    setExpandedPropertyId((current) => {
                                        if (current === p.id) {
                                            if (isDirty(p.id)) {
                                                const shouldCollapse = window.confirm(
                                                    "You have unsaved changes for this property. Collapse anyway and keep changes only locally until you save?"
                                                );

                                                if (!shouldCollapse) {
                                                    return current;
                                                }
                                            }

                                            return null;
                                        }

                                        if (current && isDirty(current)) {
                                            const shouldSwitch = window.confirm(
                                                "You have unsaved changes in the currently open property. Switch anyway and keep changes only locally until you save?"
                                            );

                                            if (!shouldSwitch) {
                                                return current;
                                            }
                                        }

                                        return p.id;
                                    });
                                }}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-semibold text-white">
                                                {draft.title || draft.address || "Property"}
                                            </div>

                                            {p.is_primary ? (
                                                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                                                    Primary
                                                </span>
                                            ) : displayRank ? (
                                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/55">
                                                    Rank {displayRank}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="mt-1 text-xs text-white/60">
                                            {([draft.address, draft.area, draft.city]
                                                .filter(Boolean)
                                                .join(", ")) || "No location details"}
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                            <span
                                                className={
                                                    p.is_primary
                                                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 text-white/70"
                                                        : "rounded-full border border-white/10 px-2 py-1 text-white/60"
                                                }
                                            >
                                                Price: {draft.asking_price || "—"}
                                            </span>
                                            <span
                                                className={
                                                    p.is_primary
                                                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 text-white/70"
                                                        : "rounded-full border border-white/10 px-2 py-1 text-white/60"
                                                }
                                            >
                                                Size: {draft.size_sqm || "—"} sqm
                                            </span>
                                            <span
                                                className={
                                                    p.is_primary
                                                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 text-white/70"
                                                        : "rounded-full border border-white/10 px-2 py-1 text-white/60"
                                                }
                                            >
                                                Verdict: {formatAnalystVerdict(draft.analyst_verdict)}
                                            </span>
                                            <span
                                                className={
                                                    p.is_primary
                                                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 text-white/70"
                                                        : "rounded-full border border-white/10 px-2 py-1 text-white/60"
                                                }
                                            >
                                                Score: {formatScore(displayedOverallScore)}
                                            </span>
                                            <span
                                                className={
                                                    p.is_primary
                                                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/8 px-2 py-1 text-white/70"
                                                        : "rounded-full border border-white/10 px-2 py-1 text-white/60"
                                                }
                                            >
                                                Signal: {displayedSignal}
                                            </span>
                                            {dirty ? (
                                                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-amber-100">
                                                    Unsaved
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-start gap-2 text-xs text-white/50 md:items-end">
                                        {p.is_primary ? (
                                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                                                Focus Property
                                            </span>
                                        ) : null}

                                        {saved ? (
                                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                                                Saved
                                            </span>
                                        ) : null}

                                        {error ? (
                                            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-red-100">
                                                Error
                                            </span>
                                        ) : null}

                                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                                            {isOpen ? "Collapse" : "Expand"}
                                        </span>
                                    </div>
                                </div>
                            </summary>

                            <div className="space-y-6 border-t border-white/10 p-5">
                                <WorkspaceSection title="Listing Data" defaultOpen>
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="mt-1 text-xs text-white/45">
                                                Created {formatDateDisplay(p.created_at)}
                                            </div>

                                            {draft.listing_url ? (
                                                <a
                                                    href={draft.listing_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-block text-xs text-blue-400 underline"
                                                >
                                                    Open listing
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>Property title</FieldLabel>
                                            <input
                                                value={draft.title}
                                                onChange={(e) =>
                                                    updateField(p.id, "title", e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Address</FieldLabel>
                                            <input
                                                value={draft.address}
                                                onChange={(e) =>
                                                    updateField(p.id, "address", e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>City</FieldLabel>
                                            <input
                                                value={draft.city}
                                                onChange={(e) =>
                                                    updateField(p.id, "city", e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Area / district</FieldLabel>
                                            <input
                                                value={draft.area}
                                                onChange={(e) =>
                                                    updateField(p.id, "area", e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Listing URL</FieldLabel>
                                            <input
                                                value={draft.listing_url}
                                                onChange={(e) =>
                                                    updateField(p.id, "listing_url", e.target.value)
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Asking price</FieldLabel>
                                            <input
                                                value={draft.asking_price}
                                                onChange={(e) =>
                                                    updateField(p.id, "asking_price", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Size (sqm)</FieldLabel>
                                            <input
                                                value={draft.size_sqm}
                                                onChange={(e) =>
                                                    updateField(p.id, "size_sqm", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Acquisition Model" defaultOpen>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>Purchase price estimate</FieldLabel>
                                            <input
                                                value={draft.purchase_price_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "purchase_price_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Renovation cost estimate</FieldLabel>
                                            <input
                                                value={draft.renovation_cost_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "renovation_cost_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Transaction cost estimate</FieldLabel>
                                            <input
                                                value={draft.transaction_cost_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "transaction_cost_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Furniture setup estimate</FieldLabel>
                                            <input
                                                value={draft.furniture_setup_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "furniture_setup_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Other expenses estimate</FieldLabel>
                                            <input
                                                value={draft.other_expenses_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "other_expenses_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Total investment estimate</FieldLabel>
                                            <input
                                                value={formatCurrency(toNullableNumber(draft.total_investment_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Rental Scenarios" defaultOpen>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>Expected monthly rent LTR</FieldLabel>
                                            <input
                                                value={draft.expected_monthly_rent_ltr}
                                                onChange={(e) =>
                                                    updateField(p.id, "expected_monthly_rent_ltr", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Average nightly rate STR</FieldLabel>
                                            <input
                                                value={draft.str_avg_nightly_rate_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "str_avg_nightly_rate_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Occupancy rate STR (%)</FieldLabel>
                                            <input
                                                value={draft.occupancy_rate_str}
                                                onChange={(e) =>
                                                    updateField(p.id, "occupancy_rate_str", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Monthly costs LTR</FieldLabel>
                                            <input
                                                value={draft.monthly_costs_ltr_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "monthly_costs_ltr_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Monthly costs STR</FieldLabel>
                                            <input
                                                value={draft.monthly_costs_str_est}
                                                onChange={(e) =>
                                                    updateField(p.id, "monthly_costs_str_est", e.target.value)
                                                }
                                                type="number"
                                                step="0.01"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Investment Metrics">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>Annual income LTR</FieldLabel>
                                            <input
                                                value={formatCurrency(toNullableNumber(draft.annual_income_ltr_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Annual income STR</FieldLabel>
                                            <input
                                                value={formatCurrency(toNullableNumber(draft.annual_income_str_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Gross yield LTR (%)</FieldLabel>
                                            <input
                                                value={formatPercent(toNullableNumber(draft.gross_yield_ltr_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Gross yield STR (%)</FieldLabel>
                                            <input
                                                value={formatPercent(toNullableNumber(draft.gross_yield_str_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>ROI LTR (%)</FieldLabel>
                                            <input
                                                value={formatPercent(toNullableNumber(draft.roi_ltr_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>ROI STR (%)</FieldLabel>
                                            <input
                                                value={formatPercent(toNullableNumber(draft.roi_str_est))}
                                                readOnly
                                                type="text"
                                                step="0.01"
                                                className={`${inputClass} cursor-not-allowed bg-white/5 text-white/70`}
                                            />
                                        </div>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Derived Preview">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Total investment
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatCurrency(totalInvestmentPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Annual net LTR
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatCurrency(annualNetIncomeLtrPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Occupied nights / month
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {estimatedOccupiedNightsStrPreview === null
                                                    ? "—"
                                                    : estimatedOccupiedNightsStrPreview.toFixed(1)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Estimated monthly STR income
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatCurrency(estimatedMonthlyIncomeStrPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Annual net STR
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatCurrency(annualNetIncomeStrPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Gross yield LTR
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatPercent(grossYieldLtrPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Gross yield STR
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatPercent(grossYieldStrPreview)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Conservative ROI basis
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatPercent(conservativeReturnBasis)}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-white/45">
                                        Preview only. These values are derived locally from the current form inputs and do not create stored scoring data.
                                    </p>
                                </WorkspaceSection>

                                <WorkspaceSection title="Risk Evaluation" defaultOpen>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>Location risk</FieldLabel>
                                            <select
                                                value={draft.location_risk_level}
                                                onChange={(e) =>
                                                    updateField(p.id, "location_risk_level", e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Select risk level</option>
                                                <option value="low">Low</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>Liquidity risk</FieldLabel>
                                            <select
                                                value={draft.liquidity_risk_level}
                                                onChange={(e) =>
                                                    updateField(p.id, "liquidity_risk_level", e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Select risk level</option>
                                                <option value="low">Low</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>Renovation risk</FieldLabel>
                                            <select
                                                value={draft.renovation_risk_level}
                                                onChange={(e) =>
                                                    updateField(p.id, "renovation_risk_level", e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Select risk level</option>
                                                <option value="low">Low</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>Financing risk</FieldLabel>
                                            <select
                                                value={draft.financing_risk_level}
                                                onChange={(e) =>
                                                    updateField(p.id, "financing_risk_level", e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Select risk level</option>
                                                <option value="low">Low</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>Building condition</FieldLabel>
                                            <select
                                                value={draft.building_condition_level}
                                                onChange={(e) =>
                                                    updateField(p.id, "building_condition_level", e.target.value)
                                                }
                                                className={selectClass}
                                            >
                                                <option value="">Select condition</option>
                                                <option value="poor">Poor</option>
                                                <option value="fair">Fair</option>
                                                <option value="good">Good</option>
                                                <option value="excellent">Excellent</option>
                                            </select>
                                        </div>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Decision Support Preview">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Location score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedLocationScore)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Liquidity score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedLiquidityScore)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Renovation score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedRenovationScore)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Financing score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedFinancingScore)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Building condition score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedBuildingConditionScore)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                Investment score
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white">
                                                {formatScore(displayedInvestmentScore)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                    Overall score
                                                </div>
                                                <div className="mt-1 text-base font-semibold text-white">
                                                    {formatScore(displayedOverallScore)}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                    Signal
                                                </div>
                                                <div className="mt-1 text-base font-semibold text-white">
                                                    {displayedSignal}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-xs text-white/45">
                                            Stored scoring is recalculated on save. Until then, the workspace shows a conservative preview signal based on the current form inputs. It favors LTR ROI first when available, then falls back to STR.
                                        </p>
                                    </div>
                                </WorkspaceSection>

                                <WorkspaceSection title="Notes and Verdict" defaultOpen>
                                    <div>
                                        <FieldLabel>Risk summary</FieldLabel>
                                        <textarea
                                            value={draft.risk_summary}
                                            onChange={(e) => updateField(p.id, "risk_summary", e.target.value)}
                                            className={textareaClass}
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>Building condition notes</FieldLabel>
                                        <textarea
                                            value={draft.building_condition_notes}
                                            onChange={(e) => updateField(p.id, "building_condition_notes", e.target.value)}
                                            className={textareaClass}
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>Financing notes</FieldLabel>
                                        <textarea
                                            value={draft.financing_notes}
                                            onChange={(e) => updateField(p.id, "financing_notes", e.target.value)}
                                            className={textareaClass}
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>Analyst notes</FieldLabel>
                                        <textarea
                                            value={draft.analyst_notes}
                                            onChange={(e) => updateField(p.id, "analyst_notes", e.target.value)}
                                            className={textareaClass}
                                            rows={4}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>General property notes</FieldLabel>
                                        <textarea
                                            value={draft.notes}
                                            onChange={(e) => updateField(p.id, "notes", e.target.value)}
                                            className={textareaClass}
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>Analyst verdict</FieldLabel>
                                        <select
                                            value={draft.analyst_verdict}
                                            onChange={(e) => updateField(p.id, "analyst_verdict", e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">Select verdict</option>
                                            <option value="buy">Buy</option>
                                            <option value="buy_below_price">Buy Below Price</option>
                                            <option value="reject">Reject</option>
                                        </select>
                                    </div>
                                </WorkspaceSection>

                                <div
                                    id={`property-actions-${p.id}`}
                                    className={
                                        p.is_primary
                                            ? "sticky bottom-3 z-10 space-y-3 rounded-xl border border-emerald-400/20 bg-[#10261f]/90 p-3 backdrop-blur"
                                            : "sticky bottom-3 z-10 space-y-3 rounded-xl border border-white/10 bg-[#0f1c2e]/90 p-3 backdrop-blur"
                                    }
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => saveProperty(p.id)}
                                            disabled={!dirty || busy}
                                            className={
                                                dirty && !busy
                                                    ? "rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                                                    : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                                            }
                                        >
                                            {saving ? "Saving…" : "Save Evaluation"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPrimaryProperty(p.id)}
                                            disabled={busy || p.is_primary || hasAnyUnsavedChanges}
                                            className={
                                                !busy && !p.is_primary && !hasAnyUnsavedChanges
                                                    ? "rounded-md border border-emerald-400/30 px-4 py-2 text-xs text-emerald-100 hover:bg-emerald-500/10"
                                                    : p.is_primary
                                                        ? "rounded-md border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100 cursor-not-allowed"
                                                        : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                                            }
                                        >
                                            {settingPrimary
                                                ? "Updating…"
                                                : p.is_primary
                                                    ? "Current Primary"
                                                    : "Set as Primary"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => attemptCollapse(p.id)}
                                            className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                        >
                                            Collapse
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => reorderProperty(p.id, "up")}
                                                disabled={
                                                    busy ||
                                                    p.is_primary ||
                                                    isFirstNonPrimary ||
                                                    hasAnyUnsavedChanges
                                                }
                                                className={
                                                    !busy &&
                                                        !p.is_primary &&
                                                        !isFirstNonPrimary &&
                                                        !hasAnyUnsavedChanges
                                                        ? "rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                                        : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                                                }
                                            >
                                                {reordering ? "Moving…" : "Move Up"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => reorderProperty(p.id, "down")}
                                                disabled={
                                                    busy ||
                                                    p.is_primary ||
                                                    isLastNonPrimary ||
                                                    hasAnyUnsavedChanges
                                                }
                                                className={
                                                    !busy &&
                                                        !p.is_primary &&
                                                        !isLastNonPrimary &&
                                                        !hasAnyUnsavedChanges
                                                        ? "rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                                        : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                                                }
                                            >
                                                {reordering ? "Moving…" : "Move Down"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteProperty(p.id)}
                                                disabled={busy}
                                                className={
                                                    !busy
                                                        ? "rounded-md border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10"
                                                        : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                                                }
                                            >
                                                {deleting ? "Deleting…" : "Delete Property"}
                                            </button>
                                        </div>

                                        <div className="min-h-[20px] text-xs">
                                            {error ? (
                                                <span className="text-red-300">{error}</span>
                                            ) : saved ? (
                                                <span className="text-white/60">Saved</span>
                                            ) : hasAnyUnsavedChanges ? (
                                                <span className="text-white/45">
                                                    Save or discard unsaved changes before reordering or changing primary.
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                    );
                })
            ) : (
                <div className="text-sm text-white/60">
                    No properties added to this case yet.
                </div>
            )}
        </div >
    );
}