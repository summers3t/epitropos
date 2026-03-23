"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getReportsStoragePath(
    storagePath: string | null | undefined,
    fileUrl: string | null | undefined
) {
    if (storagePath) {
        return storagePath;
    }

    if (!fileUrl) {
        return null;
    }

    const marker = "/storage/v1/object/public/reports/";
    const markerIndex = fileUrl.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const rawPath = fileUrl.slice(markerIndex + marker.length);

    if (!rawPath) {
        return null;
    }

    return decodeURIComponent(rawPath);
}

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

export async function createDraftReport(caseId: string) {
    const { supabase, user } = await requireAdmin();

    const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, title, status")
        .eq("id", caseId)
        .maybeSingle();

    if (caseError) {
        throw new Error(caseError.message);
    }

    if (!caseRow) {
        redirect("/admin/cases");
    }

    if (caseRow.status === "closed") {
        redirect(
            `/admin/cases/${caseId}?reportError=${encodeURIComponent(
                "Closed cases cannot be modified."
            )}`
        );
    }

    const { data: existingDraft, error: existingDraftError } = await supabase
        .from("reports")
        .select("id")
        .eq("case_id", caseId)
        .eq("published", false)
        .maybeSingle();

    if (existingDraftError) {
        throw new Error(existingDraftError.message);
    }

    if (!existingDraft) {
        const defaultTitle = caseRow.title
            ? `${caseRow.title} Report`
            : "Advisory Report";

        const { error: insertError } = await supabase.from("reports").insert({
            case_id: caseId,
            title: defaultTitle,
            summary: null,
            file_url: null,
            published: false,
            created_by: user.id,
        });

        if (insertError) {
            throw new Error(insertError.message);
        }
    }

    redirect(`/admin/cases/${caseId}`);
}

export async function updateDraftReport(reportId: string, formData: FormData) {
    const { supabase } = await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const storagePath = String(formData.get("storage_path") ?? "").trim();

    const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("id, case_id, published, storage_path, file_url")
        .eq("id", reportId)
        .maybeSingle();

    if (reportError) {
        throw new Error(reportError.message);
    }

    if (!report) {
        redirect("/admin/cases");
    }

    const { data: caseRow, error: caseRowError } = await supabase
        .from("cases")
        .select("id, status")
        .eq("id", report.case_id)
        .maybeSingle();

    if (caseRowError) {
        throw new Error(caseRowError.message);
    }

    if (!caseRow) {
        redirect("/admin/cases");
    }

    if (caseRow.status === "closed") {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Closed cases cannot be modified."
            )}`
        );
    }

    if (report.published) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Published reports are read-only. Unpublish first if you need to edit."
            )}`
        );
    }

    if (!title) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Report title is required."
            )}`
        );
    }

    const previousStoragePath = getReportsStoragePath(
        report.storage_path,
        report.file_url
    );
    const nextStoragePath = storagePath || null;

    if (
        previousStoragePath &&
        nextStoragePath &&
        previousStoragePath !== nextStoragePath
    ) {
        const { error: removeError } = await supabase.storage
            .from("reports")
            .remove([previousStoragePath]);

        if (removeError) {
            throw new Error(removeError.message);
        }
    }

    const { error: updateError } = await supabase
        .from("reports")
        .update({
            title,
            summary: summary || null,
            storage_path: storagePath || null,
            file_url: null,
        })
        .eq("id", report.id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    redirect(
        `/admin/cases/${report.case_id}?reportNotice=${encodeURIComponent(
            "Draft saved."
        )}`
    );
}

export async function publishReport(reportId: string, formData: FormData) {
    const { supabase } = await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const storagePath = String(formData.get("storage_path") ?? "").trim();

    const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("id, case_id, published")
        .eq("id", reportId)
        .maybeSingle();

    if (reportError) {
        throw new Error(reportError.message);
    }

    if (!report) {
        redirect("/admin/cases");
    }

    if (report.published) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "This report is already published."
            )}`
        );
    }

    const { data: caseRow, error: caseRowError } = await supabase
        .from("cases")
        .select("status, decision_status, decision_summary")
        .eq("id", report.case_id)
        .maybeSingle();

    if (caseRowError) {
        throw new Error(caseRowError.message);
    }

    if (caseRow?.status === "closed") {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Closed cases cannot be modified."
            )}`
        );
    }

    if (!title || !storagePath) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Publish requires title and uploaded report file."
            )}`
        );
    }

    if (caseRow && (!caseRow.decision_status || caseRow.decision_status === "pending")) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Publish requires a saved final conclusion first."
            )}`
        );
    }

    if (
        caseRow &&
        caseRow.decision_status &&
        caseRow.decision_status !== "pending" &&
        !summary
    ) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Published reports must include a summary that aligns with the case decision."
            )}`
        );
    }

    if (!summary) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Publish requires report summary."
            )}`
        );
    }

    if (!storagePath.startsWith(`case-${report.case_id}/report-${report.id}/`)) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Invalid report file. Upload the PDF through the platform before publishing."
            )}`
        );
    }

    const { error: updateError } = await supabase
        .from("reports")
        .update({
            title,
            summary,
            storage_path: storagePath,
            file_url: null,
            published: true,
            published_at: new Date().toISOString(),
        })
        .eq("id", report.id);

    if (updateError) {
        throw new Error(updateError.message);
    }

    redirect(
        `/admin/cases/${report.case_id}?reportNotice=${encodeURIComponent(
            "Report published."
        )}`
    );
}

export async function unpublishReport(reportId: string) {
    const { supabase } = await requireAdmin();

    const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("id, case_id, published")
        .eq("id", reportId)
        .maybeSingle();

    if (reportError) {
        throw new Error(reportError.message);
    }

    if (!report) {
        redirect("/admin/cases");
    }

    const { data: caseRow, error: caseRowError } = await supabase
        .from("cases")
        .select("id, status")
        .eq("id", report.case_id)
        .maybeSingle();

    if (caseRowError) {
        throw new Error(caseRowError.message);
    }

    if (!caseRow) {
        redirect("/admin/cases");
    }

    if (caseRow.status === "closed") {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Closed cases cannot be modified."
            )}`
        );
    }

    const { count: publishedCount, error: publishedCountError } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("case_id", report.case_id)
        .eq("published", true);

    if (publishedCountError) {
        throw new Error(publishedCountError.message);
    }

    if (
        report.published &&
        (caseRow.status === "delivered" || caseRow.status === "closed") &&
        (publishedCount ?? 0) <= 1
    ) {
        redirect(
            `/admin/cases/${report.case_id}?reportError=${encodeURIComponent(
                "Delivered or closed cases must keep at least one published report."
            )}`
        );
    }

    if (report.published) {
        const { error: updateError } = await supabase
            .from("reports")
            .update({
                published: false,
                published_at: null,
            })
            .eq("id", report.id);

        if (updateError) {
            throw new Error(updateError.message);
        }
    }

    redirect(
        `/admin/cases/${report.case_id}?reportNotice=${encodeURIComponent(
            "Report unpublished."
        )}`
    );
}