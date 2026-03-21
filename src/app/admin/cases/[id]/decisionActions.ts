"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    return { supabase, user };
}

export async function updateCaseDecision(caseId: string, formData: FormData) {
    const { supabase } = await requireAdmin();

    const decisionStatus = String(formData.get("decision_status") ?? "").trim();
    const decisionSummary = String(formData.get("decision_summary") ?? "").trim();
    const recommendedPropertyIdRaw = String(
        formData.get("recommended_property_id") ?? ""
    ).trim();

    const recommendedPropertyId =
        recommendedPropertyIdRaw || null;

    // 1. Load case
    const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id")
        .eq("id", caseId)
        .maybeSingle();

    if (caseError) {
        throw new Error(caseError.message);
    }

    if (!caseRow) {
        redirect("/admin/cases");
    }

    // 2. Validate status
    const allowedStatuses = [
        "pending",
        "recommended",
        "watchlist",
        "rejected_all",
    ];

    if (!allowedStatuses.includes(decisionStatus)) {
        redirect(
            `/admin/cases/${caseId}?decisionError=${encodeURIComponent(
                "Invalid decision status."
            )}`
        );
    }

    // 3. Recommended logic
    if (decisionStatus === "recommended") {
        if (!recommendedPropertyId) {
            redirect(
                `/admin/cases/${caseId}?decisionError=${encodeURIComponent(
                    "Recommended property is required."
                )}`
            );
        }

        const { data: property, error: propertyError } = await supabase
            .from("case_properties")
            .select("id, case_id")
            .eq("id", recommendedPropertyId)
            .maybeSingle();

        if (propertyError) {
            throw new Error(propertyError.message);
        }

        if (!property || property.case_id !== caseId) {
            redirect(
                `/admin/cases/${caseId}?decisionError=${encodeURIComponent(
                    "Selected property does not belong to this case."
                )}`
            );
        }
    }

    // 4. Rejected logic
    if (decisionStatus === "rejected_all") {
        if (recommendedPropertyId) {
            redirect(
                `/admin/cases/${caseId}?decisionError=${encodeURIComponent(
                    "Rejected cases cannot have a recommended property."
                )}`
            );
        }
    }

    // 5. Optional validation for other statuses
    if (
        (decisionStatus === "pending" || decisionStatus === "watchlist") &&
        recommendedPropertyId
    ) {
        const { data: property, error: propertyError } = await supabase
            .from("case_properties")
            .select("id, case_id")
            .eq("id", recommendedPropertyId)
            .maybeSingle();

        if (propertyError) {
            throw new Error(propertyError.message);
        }

        if (!property || property.case_id !== caseId) {
            redirect(
                `/admin/cases/${caseId}?decisionError=${encodeURIComponent(
                    "Selected property does not belong to this case."
                )}`
            );
        }
    }

    // 6. Update
    const { error: updateError } = await supabase
        .from("cases")
        .update({
            decision_status: decisionStatus,
            recommended_property_id: recommendedPropertyId,
            decision_summary: decisionSummary || null,
            decision_updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);

    if (updateError) {
        throw new Error(updateError.message);
    }

    redirect(
        `/admin/cases/${caseId}?decisionNotice=${encodeURIComponent(
            "Decision updated."
        )}`
    );
}