import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import PropertyWorkspace from "./PropertyWorkspace";
import ReportActionButton from "./ReportActionButton";
import ReportsSection from "./ReportsSection";
import ReportUploadControl from "./ReportUploadControl";
import DecisionActionButton from "./DecisionActionButton";
import DecisionRestorePosition from "./DecisionRestorePosition";
import DecisionFormClient from "./DecisionFormClient";
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

function formatCaseTitle(title: string | null | undefined) {
    if (!title) return "Client Case";

    return title.startsWith("Case for ") ? title.slice("Case for ".length) : title;
}

function formatDecisionStatusLabel(status: string | null | undefined) {
    if (!status) return "Pending";

    const labels: Record<string, string> = {
        pending: "Pending",
        watchlist: "Watchlist",
        recommended: "Recommended",
        rejected_all: "Rejected all",
    };

    return labels[status] ?? status;
}

function getDecisionHelp(status: string | null | undefined) {
    switch (status) {
        case "watchlist":
            return "Promising case, but not ready for a final recommendation yet.";
        case "recommended":
            return "Final client conclusion with one selected property.";
        case "rejected_all":
            return "This case should not proceed with any property.";
        case "pending":
        default:
            return "No final client conclusion has been set yet.";
    }
}

function getReportSectionHelp(reportCount: number) {
    if (reportCount > 0) {
        return "Draft, review, publish, and manage the written client deliverable for this case.";
    }

    return "Create the written client deliverable for this case once the conclusion is ready.";
}

function getReportSummaryLabel() {
    return "Report summary";
}

function formatAdminDateTime(value: string | null | undefined) {
    if (!value) return "—";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Sofia",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(value));

    const day = parts.find((part) => part.type === "day")?.value ?? "--";
    const month = parts.find((part) => part.type === "month")?.value ?? "--";
    const year = parts.find((part) => part.type === "year")?.value ?? "----";
    const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "--";

    return `${day}.${month}.${year} ${hour}:${minute}`;
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
        caseStatusError?: string;
        caseStatusNotice?: string;
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
        caseStatusError,
        caseStatusNotice,
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
            redirect(
                `/admin/cases/${caseId}?caseStatusError=${encodeURIComponent(
                    "Invalid case status."
                )}`
            );
        }

        const { data: currentCase, error: currentCaseError } = await supabase
            .from("cases")
            .select("id, status, decision_status")
            .eq("id", caseId)
            .maybeSingle();

        if (currentCaseError) {
            throw new Error(currentCaseError.message);
        }

        if (!currentCase) {
            redirect("/admin/cases");
        }

        const allowedTransitions: Record<string, string[]> = {
            active: ["analysis"],
            analysis: ["delivered"],
            delivered: ["closed"],
            closed: [],
        };

        if (!allowedTransitions[currentCase.status]?.includes(newStatus)) {
            redirect(
                `/admin/cases/${caseId}?caseStatusError=${encodeURIComponent(
                    `Invalid case transition: ${currentCase.status} → ${newStatus}`
                )}`
            );
        }

        if (newStatus === "delivered") {
            const [{ data: publishedReport, error: publishedReportError }] =
                await Promise.all([
                    supabase
                        .from("reports")
                        .select("id")
                        .eq("case_id", caseId)
                        .eq("published", true)
                        .limit(1)
                        .maybeSingle(),
                ]);

            if (publishedReportError) {
                throw new Error(publishedReportError.message);
            }

            if (!publishedReport) {
                redirect(
                    `/admin/cases/${caseId}?caseStatusError=${encodeURIComponent(
                        "Case cannot be delivered without at least one published report."
                    )}`
                );
            }

            if (!currentCase.decision_status || currentCase.decision_status === "pending") {
                redirect(
                    `/admin/cases/${caseId}?caseStatusError=${encodeURIComponent(
                        "Case cannot be delivered without a final conclusion."
                    )}`
                );
            }
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

        redirect(
            `/admin/cases/${caseId}?caseStatusNotice=${encodeURIComponent(
                "Case status updated."
            )}`
        );
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

        const { data: caseRow, error: caseRowError } = await supabase
            .from("cases")
            .select("id, status")
            .eq("id", caseId)
            .maybeSingle();

        if (caseRowError) {
            throw new Error(caseRowError.message);
        }

        if (!caseRow) {
            redirect("/admin/cases");
        }

        if (caseRow.status === "delivered" || caseRow.status === "closed") {
            redirect(
                `/admin/cases/${caseId}?caseStatusError=${encodeURIComponent(
                    "Properties cannot be modified after delivery."
                )}`
            );
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
            "id, client_id, order_id, screening_request_id, title, status, created_at, decision_status, recommended_property_id, decision_summary, decision_updated_at"
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
            "id, case_id, title, summary, storage_path, file_url, published, created_by, created_at, published_at"
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
                    {formatCaseTitle(caseItem.title)}
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
                        Created {formatAdminDateTime(caseItem.created_at)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                        <form action={updateCaseStatus} className="flex items-center gap-2">
                            <input type="hidden" name="case_id" value={caseItem.id} />

                            <select
                                name="status"
                                defaultValue=""
                                className={selectClass}
                            >
                                <option value="" disabled>
                                    Select next status
                                </option>

                                {caseItem.status === "active" ? (
                                    <option value="analysis">Analysis</option>
                                ) : null}

                                {caseItem.status === "analysis" ? (
                                    <option value="delivered">Delivered</option>
                                ) : null}

                                {caseItem.status === "delivered" ? (
                                    <option value="closed">Closed</option>
                                ) : null}
                            </select>

                            <button
                                type="submit"
                                disabled={caseItem.status === "closed"}
                                className="rounded-md border border-white/15 px-3 py-1 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Update
                            </button>
                        </form>

                        <div className="space-y-2">
                            <p className="text-[11px] text-white/45">
                                Flow: Active → Analysis → Delivered → Closed. Delivery requires a final conclusion and at least one published report.
                            </p>

                            {caseStatusError ? (
                                <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                                    {caseStatusError}
                                </div>
                            ) : null}

                            {caseStatusNotice ? (
                                <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                                    {caseStatusNotice}
                                </div>
                            ) : null}
                        </div>

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
                                {clientProfile?.full_name || "—"}
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
                                    <span className="text-white/45">Screening / case label: </span>
                                    {screening.name || "—"}
                                </div>

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

                {caseItem.status !== "delivered" && caseItem.status !== "closed" ? (
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
                ) : null}

                <PropertyWorkspace
                    caseId={caseItem.id}
                    initialProperties={properties ?? []}
                    initialExpandedPropertyId={openProperty ?? null}
                    isLocked={
                        caseItem.status === "delivered" || caseItem.status === "closed"
                    }
                />

                <div className="flex items-center gap-3 border-t border-white/10 pt-2">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                        Final step
                    </span>
                    <p className="text-[11px] text-white/40">
                        Internal analysis above. Client-facing conclusion below.
                    </p>
                </div>

                <section className="space-y-6 rounded-3xl border border-emerald-400/20 bg-white/5 p-6 backdrop-blur">
                    <DecisionRestorePosition />

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100">
                                Final client conclusion
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                                {formatDecisionStatusLabel(caseItem.decision_status)}
                            </span>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Case Conclusion
                            </h2>
                            <p className="mt-1 text-xs text-white/55">
                                Define the final client-facing conclusion that appears in the client portal.
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-white/40">
                                {getDecisionHelp(caseItem.decision_status)}
                            </p>
                            <p className="mt-1 text-[11px] text-white/40">
                                {caseItem.decision_updated_at
                                    ? `Last updated ${formatAdminDateTime(caseItem.decision_updated_at)}`
                                    : "No saved conclusion yet."}
                            </p>
                        </div>
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

                    <DecisionFormClient>
                        <form action={updateCaseDecision} className="space-y-4">
                            <input type="hidden" name="case_id" value={caseItem.id} />

                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                    Conclusion status
                                </label>
                                <select
                                    name="decision_status"
                                    defaultValue={caseItem.decision_status ?? "pending"}
                                    className={selectClass}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="watchlist">Watchlist</option>
                                    <option value="recommended">Recommended</option>
                                    <option value="rejected_all">Rejected all</option>
                                </select>

                                <div className="mt-2 space-y-1 text-[11px] leading-5 text-white/45">
                                    <p data-decision-help="pending">
                                        No final client conclusion has been set yet.
                                    </p>
                                    <p
                                        data-decision-help="watchlist"
                                        className="hidden"
                                    >
                                        Promising case, but not ready for a final client conclusion yet.
                                    </p>
                                    <p
                                        data-decision-help="recommended"
                                        className="hidden"
                                    >
                                        Final client conclusion with one recommended property.
                                    </p>
                                    <p
                                        data-decision-help="rejected_all"
                                        className="hidden"
                                    >
                                        This case should not proceed with any property.
                                    </p>
                                </div>
                            </div>

                            <div
                                data-decision-when="recommended"
                                className={`${caseItem.decision_status === "recommended" ? "" : "hidden "}rounded-2xl border border-white/10 bg-black/10 p-4`}
                            >
                                <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                    Recommended property
                                </label>
                                <select
                                    name="recommended_property_id"
                                    defaultValue={caseItem.recommended_property_id ?? ""}
                                    className={selectClass}
                                >
                                    <option value="">None</option>
                                    {(properties ?? []).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title || p.address || p.id}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-[11px] leading-5 text-white/45">
                                    Required when the conclusion status is set to recommended.
                                </p>
                            </div>

                            <div
                                data-decision-when="watchlist"
                                className={`${caseItem.decision_status === "watchlist" ? "" : "hidden "}rounded-2xl border border-white/10 bg-black/10 p-4`}
                            >
                                <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                    Watchlist lead property
                                </label>
                                <select
                                    name="recommended_property_id"
                                    defaultValue={caseItem.recommended_property_id ?? ""}
                                    className={selectClass}
                                >
                                    <option value="">None</option>
                                    {(properties ?? []).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title || p.address || p.id}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-[11px] leading-5 text-white/45">
                                    Optional. Leave empty unless one property should be marked as the lead watchlist candidate.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                    Conclusion summary
                                </label>
                                <textarea
                                    name="decision_summary"
                                    rows={4}
                                    defaultValue={caseItem.decision_summary ?? ""}
                                    className={textareaClass}
                                    placeholder="State the final conclusion, key reasoning, and the next step for the client."
                                />
                            </div>

                            <div className="flex justify-end">
                                <DecisionActionButton className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5">
                                    Save Conclusion
                                </DecisionActionButton>
                            </div>
                        </form>
                    </DecisionFormClient>
                </section>
            </section>

            <ReportsSection reportCount={reportCount}>
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs text-white/55">
                                {getReportSectionHelp(reportCount)}
                            </p>
                        </div>
                        <form action={createDraftReport.bind(null, caseItem.id)}>
                            <ReportActionButton className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5">
                                Create Draft Report
                            </ReportActionButton>
                        </form>
                    </div>
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
                                            Created {formatAdminDateTime(report.created_at)}
                                        </div>

                                        {report.published_at ? (
                                            <div className="text-xs text-white/55">
                                                Published {formatAdminDateTime(report.published_at)}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {report.storage_path ? (
                                            <a
                                                href={`/api/reports/${report.id}/download`}
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

                                    {caseItem.decision_status &&
                                        caseItem.decision_status !== "pending" &&
                                        caseItem.decision_summary ? (
                                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                                            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100/85">
                                                Case conclusion reference
                                            </div>
                                            <p className="mt-2 text-[11px] text-white/45">
                                                Keep the executive summary aligned with the client-facing case conclusion.
                                            </p>
                                            <div className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-white/80">
                                                {caseItem.decision_summary}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-medium text-white/75">
                                            {getReportSummaryLabel()}
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
                                        key={`report-upload-${report.id}-${report.storage_path ?? report.file_url ?? "empty"}`}
                                        caseId={caseItem.id}
                                        reportId={report.id}
                                        initialStoragePath={report.storage_path ?? ""}
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