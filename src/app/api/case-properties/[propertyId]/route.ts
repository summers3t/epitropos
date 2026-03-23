import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function riskLevelToScore(value: string | null) {
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

function buildingConditionToScore(value: string | null) {
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

function firstNumber(...values: Array<number | null>) {
    for (const value of values) {
        if (typeof value === "number" && !Number.isNaN(value)) {
            return value;
        }
    }

    return null;
}

function scoreBand(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return "insufficient_data";
    }

    if (value >= 80) return "strong";
    if (value >= 65) return "promising";
    if (value >= 50) return "borderline";
    return "weak";
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await context.params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action ?? null;

    if (action === "move_up" || action === "move_down" || action === "set_primary") {
        const { data: currentProperty, error: currentPropertyError } = await supabase
            .from("case_properties")
            .select("id, case_id, sort_order, is_primary")
            .eq("id", propertyId)
            .maybeSingle();

        if (currentPropertyError) {
            return NextResponse.json(
                { error: currentPropertyError.message },
                { status: 400 }
            );
        }

        if (!currentProperty) {
            return NextResponse.json(
                { error: "Property not found." },
                { status: 404 }
            );
        }

        const { data: caseRow, error: caseRowError } = await supabase
            .from("cases")
            .select("id, status")
            .eq("id", currentProperty.case_id)
            .maybeSingle();

        if (caseRowError) {
            return NextResponse.json(
                { error: caseRowError.message },
                { status: 400 }
            );
        }

        if (!caseRow) {
            return NextResponse.json(
                { error: "Case not found." },
                { status: 404 }
            );
        }

        if (caseRow.status === "delivered" || caseRow.status === "closed") {
            return NextResponse.json(
                { error: "Properties cannot be modified after delivery." },
                { status: 400 }
            );
        }

        if (action === "set_primary") {
            const timestamp = new Date().toISOString();

            const { error: clearPrimaryError } = await supabase
                .from("case_properties")
                .update({
                    is_primary: false,
                    updated_at: timestamp,
                })
                .eq("case_id", currentProperty.case_id)
                .eq("is_primary", true);

            if (clearPrimaryError) {
                return NextResponse.json(
                    { error: clearPrimaryError.message },
                    { status: 400 }
                );
            }

            const { error: setPrimaryError } = await supabase
                .from("case_properties")
                .update({
                    is_primary: true,
                    updated_at: timestamp,
                })
                .eq("id", propertyId);

            if (setPrimaryError) {
                return NextResponse.json(
                    { error: setPrimaryError.message },
                    { status: 400 }
                );
            }

            return NextResponse.json({ ok: true });
        }

        if (currentProperty.is_primary) {
            return NextResponse.json({ ok: true, noop: true });
        }

        const siblingQuery =
            action === "move_up"
                ? supabase
                    .from("case_properties")
                    .select("id, sort_order")
                    .eq("case_id", currentProperty.case_id)
                    .eq("is_primary", false)
                    .lt("sort_order", currentProperty.sort_order)
                    .order("sort_order", { ascending: false })
                    .limit(1)
                    .maybeSingle()
                : supabase
                    .from("case_properties")
                    .select("id, sort_order")
                    .eq("case_id", currentProperty.case_id)
                    .eq("is_primary", false)
                    .gt("sort_order", currentProperty.sort_order)
                    .order("sort_order", { ascending: true })
                    .limit(1)
                    .maybeSingle();

        const { data: siblingProperty, error: siblingPropertyError } =
            await siblingQuery;

        if (siblingPropertyError) {
            return NextResponse.json(
                { error: siblingPropertyError.message },
                { status: 400 }
            );
        }

        if (!siblingProperty) {
            return NextResponse.json({ ok: true, noop: true });
        }

        const timestamp = new Date().toISOString();

        const { error: updateCurrentError } = await supabase
            .from("case_properties")
            .update({
                sort_order: siblingProperty.sort_order,
                updated_at: timestamp,
            })
            .eq("id", currentProperty.id);

        if (updateCurrentError) {
            return NextResponse.json(
                { error: updateCurrentError.message },
                { status: 400 }
            );
        }

        const { error: updateSiblingError } = await supabase
            .from("case_properties")
            .update({
                sort_order: currentProperty.sort_order,
                updated_at: timestamp,
            })
            .eq("id", siblingProperty.id);

        if (updateSiblingError) {
            return NextResponse.json(
                { error: updateSiblingError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true });
    }

    const { data: currentProperty, error: currentPropertyError } = await supabase
        .from("case_properties")
        .select("id, case_id")
        .eq("id", propertyId)
        .maybeSingle();

    if (currentPropertyError) {
        return NextResponse.json(
            { error: currentPropertyError.message },
            { status: 400 }
        );
    }

    if (!currentProperty) {
        return NextResponse.json(
            { error: "Property not found." },
            { status: 404 }
        );
    }

    const { data: caseRow, error: caseRowError } = await supabase
        .from("cases")
        .select("id, status")
        .eq("id", currentProperty.case_id)
        .maybeSingle();

    if (caseRowError) {
        return NextResponse.json(
            { error: caseRowError.message },
            { status: 400 }
        );
    }

    if (!caseRow) {
        return NextResponse.json(
            { error: "Case not found." },
            { status: 404 }
        );
    }

    if (caseRow.status === "delivered" || caseRow.status === "closed") {
        return NextResponse.json(
            { error: "Properties cannot be modified after delivery." },
            { status: 400 }
        );
    }

    const locationScore = riskLevelToScore(body.location_risk_level ?? null);
    const liquidityScore = riskLevelToScore(body.liquidity_risk_level ?? null);
    const renovationScore = riskLevelToScore(body.renovation_risk_level ?? null);
    const financingScore = riskLevelToScore(body.financing_risk_level ?? null);
    const buildingConditionScore = buildingConditionToScore(
        body.building_condition_level ?? null
    );

    const conservativeReturnBasis = firstNumber(
        body.roi_ltr_est ?? null,
        body.roi_str_est ?? null
    );
    const investmentScore = roiToInvestmentScore(conservativeReturnBasis);

    const overallScore = weightedScore([
        { score: locationScore, weight: 25 },
        { score: liquidityScore, weight: 20 },
        { score: renovationScore, weight: 15 },
        { score: financingScore, weight: 15 },
        { score: buildingConditionScore, weight: 10 },
        { score: investmentScore, weight: 15 },
    ]);

    const payload = {
        title: body.title ?? null,
        listing_url: body.listing_url ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        area: body.area ?? null,
        asking_price: body.asking_price ?? null,
        size_sqm: body.size_sqm ?? null,
        notes: body.notes ?? null,

        purchase_price_est: body.purchase_price_est ?? null,
        renovation_cost_est: body.renovation_cost_est ?? null,
        transaction_cost_est: body.transaction_cost_est ?? null,
        furniture_setup_est: body.furniture_setup_est ?? null,
        other_expenses_est: body.other_expenses_est ?? null,
        total_investment_est: body.total_investment_est ?? null,

        expected_monthly_rent_ltr: body.expected_monthly_rent_ltr ?? null,
        str_avg_nightly_rate_est: body.str_avg_nightly_rate_est ?? null,
        occupancy_rate_str: body.occupancy_rate_str ?? null,
        monthly_costs_ltr_est: body.monthly_costs_ltr_est ?? null,
        monthly_costs_str_est: body.monthly_costs_str_est ?? null,

        annual_income_ltr_est: body.annual_income_ltr_est ?? null,
        annual_income_str_est: body.annual_income_str_est ?? null,
        gross_yield_ltr_est: body.gross_yield_ltr_est ?? null,
        gross_yield_str_est: body.gross_yield_str_est ?? null,
        roi_ltr_est: body.roi_ltr_est ?? null,
        roi_str_est: body.roi_str_est ?? null,

        location_risk_level: body.location_risk_level ?? null,
        liquidity_risk_level: body.liquidity_risk_level ?? null,
        renovation_risk_level: body.renovation_risk_level ?? null,
        financing_risk_level: body.financing_risk_level ?? null,
        building_condition_level: body.building_condition_level ?? null,

        risk_summary: body.risk_summary ?? null,
        building_condition_notes: body.building_condition_notes ?? null,
        financing_notes: body.financing_notes ?? null,
        analyst_notes: body.analyst_notes ?? null,

        analyst_verdict: body.analyst_verdict ?? null,

        location_score_est: locationScore,
        liquidity_score_est: liquidityScore,
        renovation_score_est: renovationScore,
        financing_score_est: financingScore,
        building_condition_score_est: buildingConditionScore,
        investment_score_est: investmentScore,
        overall_score_est: overallScore,
        signal_label_est: scoreBand(overallScore),
        scoring_updated_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("case_properties")
        .update(payload)
        .eq("id", propertyId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await context.params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: currentProperty, error: currentPropertyError } = await supabase
        .from("case_properties")
        .select("id, case_id")
        .eq("id", propertyId)
        .maybeSingle();

    if (currentPropertyError) {
        return NextResponse.json(
            { error: currentPropertyError.message },
            { status: 400 }
        );
    }

    if (!currentProperty) {
        return NextResponse.json(
            { error: "Property not found." },
            { status: 404 }
        );
    }

    const { data: caseRow, error: caseRowError } = await supabase
        .from("cases")
        .select("id, status")
        .eq("id", currentProperty.case_id)
        .maybeSingle();

    if (caseRowError) {
        return NextResponse.json(
            { error: caseRowError.message },
            { status: 400 }
        );
    }

    if (!caseRow) {
        return NextResponse.json(
            { error: "Case not found." },
            { status: 404 }
        );
    }

    if (caseRow.status === "delivered" || caseRow.status === "closed") {
        return NextResponse.json(
            { error: "Properties cannot be modified after delivery." },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from("case_properties")
        .delete()
        .eq("id", propertyId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}