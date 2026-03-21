import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import PropertyWorkspace from "./PropertyWorkspace";
import ReportActionButton from "./ReportActionButton";
import ReportsSection from "./ReportsSection";
import ReportUploadControl from "./ReportUploadControl";
import {
    createDraftReport,
    publishReport,
    unpublishReport,
    updateDraftReport,
} from "./reportActions";
import {
    deleteCaseAdmin,
    deleteDraftReport,
} from "./adminCleanupActions";
import { updateCaseDecision } from "./decisionActions";

function formatCaseStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    const labels: Record<string, string> = {
        active: "Active",
        analysis: "Analysis",
        delivered: "Delivered",
        closed: "Closed",
    };

    return labels[status] ?? status;
}

type PageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        openAddProperty?: string;
        openProperty?: string;
        reportError?: string;
        reportNotice?: string;
        decisionError?: string;
        decisionNotice?: string;
    }>;
};

const inputClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35";
const textareaClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35";
const selectClass =
    "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs text-white";

export default async function AdminCaseDetailPage({
    params,
    searchParams,
}: PageProps) {
    const { id } = await params;
    const {
        openAddProperty,
        openProperty,
        reportError,
        reportNotice,
        decisionError,
        decisionNotice,
    } = await searchParams;

    async function updateCaseStatus(formData: FormData) {
        "use server";

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

        const newStatus = String(formData.get("status") ?? "").trim();
        const caseId = String(formData.get("case_id") ?? "").trim();

        if (!newStatus || !caseId) {
            redirect(`/admin/cases/${id}`);
        }

        const allowedStatuses = ["active", "analysis", "delivered", "closed"];

        if (!allowedStatuses.includes(newStatus)) {
            throw new Error("Invalid case status.");
        }

        const { error } = await supabase
            .from("cases")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", caseId);

        if (error) {
            throw new Error(error.message);
        }

        redirect(`/admin/cases/${caseId}`);
    }

    async function createCaseProperty(formData: FormData) {
        "use server";

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

        const caseId = String(formData.get("case_id") ?? "").trim();
        const title = String(formData.get("title") ?? "").trim();
        const listingUrl = String(formData.get("listing_url") ?? "").trim();
        const address = String(formData.get("address") ?? "").trim();
        const city = String(formData.get("city") ?? "").trim();
        const area = String(formData.get("area") ?? "").trim();
        const askingPriceRaw = String(formData.get("asking_price") ?? "").trim();
        const sizeSqmRaw = String(formData.get("size_sqm") ?? "").trim();
        const notes = String(formData.get("notes") ?? "").trim();

        if (!caseId) {
            redirect("/admin/cases");
        }

        const askingPrice =
            askingPriceRaw.length > 0 ? Number(askingPriceRaw) : null;
        const sizeSqm = sizeSqmRaw.length > 0 ? Number(sizeSqmRaw) : null;

        const [{ data: lastProperty, error: lastPropertyError }, { data: primaryProperty, error: primaryPropertyError }] =
            await Promise.all([
                supabase
                    .from("case_properties")
                    .select("sort_order")
                    .eq("case_id", caseId)
                    .order("sort_order", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from("case_properties")
                    .select("id")
                    .eq("case_id", caseId)
                    .eq("is_primary", true)
                    .limit(1)
                    .maybeSingle(),
            ]);

        if (lastPropertyError) {
            throw new Error(lastPropertyError.message);
        }

        if (primaryPropertyError) {
            throw new Error(primaryPropertyError.message);
        }

        const nextSortOrder =
            typeof lastProperty?.sort_order === "number"
                ? lastProperty.sort_order + 1
                : 1;

        const { data: insertedProperty, error } = await supabase
            .from("case_properties")
            .insert({
                case_id: caseId,
                title: title || null,
                listing_url: listingUrl || null,
                address: address || null,
                city: city || null,
                area: area || null,
                asking_price: askingPrice,
                size_sqm: sizeSqm,
                notes: notes || null,
                sort_order: nextSortOrder,
                is_primary: !primaryProperty,
                updated_at: new Date().toISOString(),
            })
            .select("id")
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        if (insertedProperty?.id) {
            redirect(
                `/admin/cases/${caseId}?openProperty=${insertedProperty.id}#property-${insertedProperty.id}`
            );
        }

        redirect(`/admin/cases/${caseId}`);
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/cases/${id}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: caseItem, error: caseError } = await supabase
        .from("cases")
        .select(
            "id, client_id, order_id, screening_request_id, title, status, created_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (caseError) {
        throw new Error(caseError.message);
    }

    if (!caseItem) {
        redirect("/admin/cases");
    }

    const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", caseItem.client_id)
        .maybeSingle();

    if (clientProfileError) {
        throw new Error(clientProfileError.message);
    }

    const { data: screening, error: screeningError } = caseItem.screening_request_id
        ? await supabase
            .from("screening_requests")
            .select(
                "id, name, email, plan_interest, budget_range, goal, created_at"
            )
            .eq("id", caseItem.screening_request_id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    const { data: properties, error: propertiesError } = await supabase
        .from("case_properties")
        .select(
            `
            id,
            title,
            listing_url,
            address,
            city,
            area,
            asking_price,
            size_sqm,
            notes,
            sort_order,
            is_primary,
            created_at,
            updated_at,
            purchase_price_est,
            renovation_cost_est,
            transaction_cost_est,
            furniture_setup_est,
            other_expenses_est,
            total_investment_est,
            expected_monthly_rent_ltr,
            str_avg_nightly_rate_est,
            occupancy_rate_str,
            monthly_costs_ltr_est,
            monthly_costs_str_est,
            annual_income_ltr_est,
            annual_income_str_est,
            gross_yield_ltr_est,
            gross_yield_str_est,
            roi_ltr_est,
            roi_str_est,

            location_score_est,
            liquidity_score_est,
            renovation_score_est,
            financing_score_est,
            building_condition_score_est,
            investment_score_est,
            overall_score_est,
            signal_label_est,
            scoring_updated_at,

            location_risk_level,
            liquidity_risk_level,
            renovation_risk_level,
            financing_risk_level,
            building_condition_level,
            risk_summary,
            building_condition_notes,
            financing_notes,
            analyst_notes,
            analyst_verdict
            `
        )
        .eq("case_id", caseItem.id)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (propertiesError) {
        throw new Error(propertiesError.message);
    }

    const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select(
            "id, case_id, title, summary, file_url, published, created_by, created_at, published_at"
        )
        .eq("case_id", caseItem.id)
        .order("created_at", { ascending: false });

    if (reportsError) {
        throw new Error(reportsError.message);
    }

    const propertyCount = properties?.length ?? 0;
    const reportCount = reports?.length ?? 0;

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/admin/cases"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 transition hover:text-white"
                >
                    ← Back to cases
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Case Workspace
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    {caseItem.title || "Client Case"}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                    <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em]">
                        {formatCaseStatusLabel(caseItem.status)}
                    </span>

                    <span>Case ID: {caseItem.id}</span>

                    <Link
                        href={`/admin/orders/${caseItem.order_id}`}
                        className="underline underline-offset-2 hover:text-white"
                    >
                        Order: {caseItem.order_id}
                    </Link>

                    {caseItem.screening_request_id ? (
                        <Link
                            href={`/admin/screening/${caseItem.screening_request_id}`}
                            className="underline underline-offset-2 hover:text-white"
                        >
                            Screening: {caseItem.screening_request_id}
                        </Link>
                    ) : null}

                    <span>
                        Created {new Date(caseItem.created_at).toISOString().slice(0, 16).replace("T", " ")}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                        <form action={updateCaseStatus} className="flex items-center gap-2">
                            <input type="hidden" name="case_id" value={caseItem.id} />

                            <select
                                name="status"
                                defaultValue={caseItem.status ?? "active"}
                                className={selectClass}
                            >
                                <option value="active">Active</option>
                                <option value="analysis">Analysis</option>
                                <option value="delivered">Delivered</option>
                                <option value="closed">Closed</option>
                            </select>

                            <button
                                type="submit"
                                className="rounded-md border border-white/15 px-3 py-1 text-xs hover:bg-white/5"
                            >
                                Update
                            </button>
                        </form>

                        <form action={deleteCaseAdmin.bind(null, caseItem.id)}>
                            <ConfirmSubmitButton
                                confirmMessage="Delete this case? This will remove the case, all linked property evaluations, and all reports. If the case already has a paid order or published report, use this only for controlled cleanup/testing."
                                className="rounded-md border border-red-400/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10"
                            >
                                Delete Case
                            </ConfirmSubmitButton>
                        </form>
                    </div>
                </div>
            </div>

            <details className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Case Context
                        </h2>
                        <p className="mt-1 text-xs text-white/55">
                            Client details and screening summary
                        </p>
                    </div>

                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                        Expand
                    </span>
                </summary>

                <div className="grid gap-6 border-t border-white/10 p-6 md:grid-cols-2">
                    <section className="rounded-2xl border border-white/10 bg-black/10 p-5">
                        <h3 className="text-sm font-semibold text-white">
                            Client information
                        </h3>

                        <div className="mt-4 space-y-2 text-sm text-white/75">
                            <div>
                                <span className="text-white/45">Name: </span>
                                {clientProfile?.full_name || screening?.name || "—"}
                            </div>

                            <div>
                                <span className="text-white/45">Email: </span>
                                {clientProfile?.email || screening?.email || "—"}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-black/10 p-5">
                        <h3 className="text-sm font-semibold text-white">
                            Screening summary
                        </h3>

                        {screening ? (
                            <div className="mt-4 space-y-2 text-sm text-white/75">
                                <div>
                                    <span className="text-white/45">Plan: </span>
                                    {screening.plan_interest || "—"}
                                </div>

                                <div>
                                    <span className="text-white/45">Budget: </span>
                                    {screening.budget_range || "—"}
                                </div>

                                <div>
                                    <span className="text-white/45">Goal: </span>
                                    {screening.goal || "—"}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-sm text-white/60">
                                No screening data available.
                            </div>
                        )}
                    </section>
                </div>
            </details>

            <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Case Properties
                        </h2>
                        <p className="mt-1 text-xs text-white/55">
                            {propertyCount} {propertyCount === 1 ? "property" : "properties"}
                        </p>
                    </div>
                </div>

                <details
                    id="add-property"
                    open={openAddProperty === "1"}
                    className="rounded-xl border border-white/10 bg-black/10"
                >
                    <summary className="cursor-pointer list-none p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="font-semibold text-white">
                                    Add Property
                                </div>
                                <div className="mt-1 text-xs text-white/60">
                                    Add a new candidate property to this case
                                </div>
                            </div>

                            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                                Expand
                            </span>
                        </div>
                    </summary>

                    <form
                        action={createCaseProperty}
                        className="space-y-4 border-t border-white/10 p-4"
                    >
                        <input type="hidden" name="case_id" value={caseItem.id} />

                        <div className="grid gap-3 md:grid-cols-2">
                            <input
                                name="title"
                                placeholder="Property title"
                                className={inputClass}
                            />

                            <input
                                name="listing_url"
                                placeholder="Listing URL"
                                className={inputClass}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <input
                                name="address"
                                placeholder="Address"
                                className={inputClass}
                            />

                            <input
                                name="city"
                                placeholder="City"
                                className={inputClass}
                            />

                            <input
                                name="area"
                                placeholder="Area / district"
                                className={inputClass}
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <input
                                name="asking_price"
                                placeholder="Asking price"
                                type="number"
                                step="0.01"
                                className={inputClass}
                            />

                            <input
                                name="size_sqm"
                                placeholder="Size (sqm)"
                                type="number"
                                step="0.01"
                                className={inputClass}
                            />
                        </div>

                        <textarea
                            name="notes"
                            placeholder="Initial notes"
                            className={textareaClass}
                            rows={3}
                        />

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                            >
                                Add Property
                            </button>
                        </div>
                    </form>
                </details>

                <PropertyWorkspace
                    caseId={caseItem.id}
                    initialProperties={properties ?? []}
                    initialExpandedPropertyId={openProperty ?? null}
                />
                <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Case Decision
                        </h2>
                        <p className="mt-1 text-xs text-white/55">
                            Client-facing conclusion for this case
                        </p>
                    </div>

                    {decisionError ? (
                        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                            {decisionError}
                        </div>
                    ) : null}

                    {decisionNotice ? (
                        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                            {decisionNotice}
                        </div>
                    ) : null}

                    <form action={updateCaseDecision} className="space-y-4">
                        <input type="hidden" name="case_id" value={caseItem.id} />

                        <div>
                            <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                Decision status
                            </label>
                            <select
                                name="decision_status"
                                defaultValue="pending"
                                className={selectClass}
                            >
                                <option value="pending">Pending</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="recommended">Recommended</option>
                                <option value="rejected_all">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                Recommended property
                            </label>
                            <select name="recommended_property_id" className={selectClass}>
                                <option value="">None</option>
                                {(properties ?? []).map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title || p.address || p.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                Decision summary
                            </label>
                            <textarea
                                name="decision_summary"
                                rows={4}
                                className={textareaClass}
                                placeholder="Client-facing conclusion..."
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                            >
                                Save Decision
                            </button>
                        </div>
                    </form>
                </section>
            </section>

            <ReportsSection reportCount={reportCount}>
                <div className="flex items-center justify-between gap-3">
                    <div />
                    <form action={createDraftReport.bind(null, caseItem.id)}>
                        <ReportActionButton className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5">
                            Create Draft Report
                        </ReportActionButton>
                    </form>
                </div>

                <div className="mt-4 space-y-4">
                    {reportError ? (
                        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                            {reportError}
                        </div>
                    ) : null}

                    {reportNotice ? (
                        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                            {reportNotice}
                        </div>
                    ) : null}

                    {reports && reports.length > 0 ? (
                        reports.map((report) => (
                            <article
                                key={report.id}
                                className="rounded-2xl border border-white/10 bg-black/10 p-5"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                                            {report.published ? "Published" : "Draft"}
                                        </span>

                                        <div className="text-xs text-white/55">
                                            Created{" "}
                                            {new Date(report.created_at)
                                                .toISOString()
                                                .slice(0, 16)
                                                .replace("T", " ")}
                                        </div>

                                        {report.published_at ? (
                                            <div className="text-xs text-white/55">
                                                Published{" "}
                                                {new Date(report.published_at)
                                                    .toISOString()
                                                    .slice(0, 16)
                                                    .replace("T", " ")}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {report.file_url ? (
                                            <a
                                                href={report.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                            >
                                                Open Report
                                            </a>
                                        ) : null}

                                        {!report.published ? (
                                            <form action={deleteDraftReport.bind(null, report.id)}>
                                                <ReportActionButton
                                                    confirmMessage="Delete this draft report? This cannot be undone."
                                                    className="rounded-md border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10"
                                                >
                                                    Delete Draft
                                                </ReportActionButton>
                                            </form>
                                        ) : (
                                            <form action={unpublishReport.bind(null, report.id)}>
                                                <ReportActionButton
                                                    confirmMessage="Unpublish this report? It will disappear from the client portal until published again."
                                                    className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                                >
                                                    Unpublish
                                                </ReportActionButton>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                <form
                                    action={updateDraftReport.bind(null, report.id)}
                                    className="mt-4 space-y-4"
                                >
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                            Report title
                                        </label>
                                        <input
                                            name="title"
                                            defaultValue={report.title}
                                            className={`${inputClass} ${report.published ? "cursor-not-allowed bg-white/5 text-white/70" : ""}`}
                                            required
                                            readOnly={report.published}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                            Executive summary
                                        </label>
                                        <textarea
                                            name="summary"
                                            defaultValue={report.summary ?? ""}
                                            rows={5}
                                            className={`${textareaClass} ${report.published ? "cursor-not-allowed bg-white/5 text-white/70" : ""}`}
                                            readOnly={report.published}
                                        />
                                    </div>

                                    <ReportUploadControl
                                        key={`report-upload-${report.id}-${report.file_url ?? "empty"}`}
                                        caseId={caseItem.id}
                                        reportId={report.id}
                                        initialFileUrl={report.file_url ?? ""}
                                        published={report.published}
                                        inputClass={inputClass}
                                    />

                                    {!report.published ? (
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <ReportActionButton
                                                formAction={updateDraftReport.bind(null, report.id)}
                                                className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                            >
                                                Save Draft
                                            </ReportActionButton>

                                            <ReportActionButton
                                                formAction={publishReport.bind(null, report.id)}
                                                className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                                            >
                                                Publish
                                            </ReportActionButton>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-white/55">
                                            Published reports are read-only. Unpublish first to edit.
                                        </div>
                                    )}
                                </form>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-white/65">
                            No report created for this case yet.
                        </div>
                    )}
                </div>
            </ReportsSection>
        </section >
    );
}