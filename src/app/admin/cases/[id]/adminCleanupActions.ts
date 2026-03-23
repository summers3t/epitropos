"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getReportStoragePath(
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

async function deleteReportFilesByCaseId(
    supabase: Awaited<ReturnType<typeof createClient>>,
    caseId: string
) {
    const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("storage_path, file_url")
        .eq("case_id", caseId);

    if (reportsError) {
        throw new Error(reportsError.message);
    }

    const storagePaths = (reports ?? [])
        .map((report) => getReportStoragePath(report.storage_path, report.file_url))
        .filter((path): path is string => !!path);

    if (storagePaths.length === 0) {
        return;
    }

    const { error: removeError } = await supabase.storage
        .from("reports")
        .remove(storagePaths);

    if (removeError) {
        throw new Error(removeError.message);
    }
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

export async function deleteCaseAdmin(caseId: string) {
    const { supabase } = await requireAdmin();

    const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, order_id")
        .eq("id", caseId)
        .maybeSingle();

    if (caseError) {
        throw new Error(caseError.message);
    }

    if (!caseRow) {
        redirect("/admin/cases");
    }

    const { data: publishedReport, error: publishedReportError } = await supabase
        .from("reports")
        .select("id")
        .eq("case_id", caseId)
        .eq("published", true)
        .maybeSingle();

    if (publishedReportError) {
        throw new Error(publishedReportError.message);
    }

    const { data: paidOrder, error: paidOrderError } = await supabase
        .from("orders")
        .select("id, payment_status")
        .eq("id", caseRow.order_id)
        .maybeSingle();

    if (paidOrderError) {
        throw new Error(paidOrderError.message);
    }

    const hasPublishedReport = !!publishedReport;
    const isPaidOrder = paidOrder?.payment_status === "paid";

    if (hasPublishedReport || isPaidOrder) {
        // Current workflow still allows controlled cleanup/testing deletion.
        // The UI warning remains the operator safeguard.
    }

    await deleteReportFilesByCaseId(supabase, caseId);

    const { error: deleteReportsError } = await supabase
        .from("reports")
        .delete()
        .eq("case_id", caseId);

    if (deleteReportsError) {
        throw new Error(deleteReportsError.message);
    }

    const { error: deleteCasePropertiesError } = await supabase
        .from("case_properties")
        .delete()
        .eq("case_id", caseId);

    if (deleteCasePropertiesError) {
        throw new Error(deleteCasePropertiesError.message);
    }

    const { error: deleteCaseError } = await supabase
        .from("cases")
        .delete()
        .eq("id", caseId);

    if (deleteCaseError) {
        throw new Error(deleteCaseError.message);
    }

    redirect("/admin/cases");
}

export async function deleteScreeningAdmin(requestId: string) {
    const { supabase } = await requireAdmin();

    const { data: request, error: requestError } = await supabase
        .from("screening_requests")
        .select("id")
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
        throw new Error(requestError.message);
    }

    if (!request) {
        redirect("/admin/screening");
    }

    const { data: offers, error: offersError } = await supabase
        .from("offers")
        .select("id")
        .eq("screening_request_id", requestId);

    if (offersError) {
        throw new Error(offersError.message);
    }

    const offerIds = (offers ?? []).map((row) => row.id);

    if (offerIds.length > 0) {
        const { error: deleteOrdersError } = await supabase
            .from("orders")
            .delete()
            .in("offer_id", offerIds);

        if (deleteOrdersError) {
            throw new Error(deleteOrdersError.message);
        }

        const { error: deleteOffersError } = await supabase
            .from("offers")
            .delete()
            .eq("screening_request_id", requestId);

        if (deleteOffersError) {
            throw new Error(deleteOffersError.message);
        }
    }

    const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id")
        .eq("screening_request_id", requestId);

    if (casesError) {
        throw new Error(casesError.message);
    }

    for (const caseRow of cases ?? []) {
        await deleteReportFilesByCaseId(supabase, caseRow.id);

        const { error: deleteReportsError } = await supabase
            .from("reports")
            .delete()
            .eq("case_id", caseRow.id);

        if (deleteReportsError) {
            throw new Error(deleteReportsError.message);
        }

        const { error: deletePropertiesError } = await supabase
            .from("case_properties")
            .delete()
            .eq("case_id", caseRow.id);

        if (deletePropertiesError) {
            throw new Error(deletePropertiesError.message);
        }
    }

    const { error: deleteCasesError } = await supabase
        .from("cases")
        .delete()
        .eq("screening_request_id", requestId);

    if (deleteCasesError) {
        throw new Error(deleteCasesError.message);
    }

    const { error: deleteScreeningError } = await supabase
        .from("screening_requests")
        .delete()
        .eq("id", requestId);

    if (deleteScreeningError) {
        throw new Error(deleteScreeningError.message);
    }

    redirect("/admin/screening");
}

export async function deleteDraftReport(reportId: string) {
    const { supabase } = await requireAdmin();

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
        throw new Error("Published reports cannot be deleted directly.");
    }

    const storagePath = getReportStoragePath(
        report.storage_path,
        report.file_url
    );

    if (storagePath) {
        const { error: removeError } = await supabase.storage
            .from("reports")
            .remove([storagePath]);

        if (removeError) {
            throw new Error(removeError.message);
        }
    }

    const { error: deleteError } = await supabase
        .from("reports")
        .delete()
        .eq("id", report.id);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    redirect(`/admin/cases/${report.case_id}`);
}