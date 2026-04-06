import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

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

function formatClientCaseTitle(title: string | null | undefined) {
  if (!title) return "Case Overview";

  return title.startsWith("Case for ")
    ? title.slice("Case for ".length)
    : title;
}

function formatDecisionStatusLabel(status: string | null | undefined) {
  if (!status) return null;

  const labels: Record<string, string> = {
    recommended: "Recommended",
    watchlist: "Watchlist",
    rejected_all: "Not recommended",
  };

  return labels[status] ?? null;
}

function getCaseStageSummary(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "Your case has been opened and review preparation is in progress.";
    case "analysis":
      return "Your property analysis is currently in progress.";
    case "delivered":
      return "Your report is available and ready for review.";
    case "closed":
      return "Your case has been completed.";
    default:
      return "Your case is currently being processed.";
  }
}

function getCaseNextStep(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "No action is required from you at this stage. We are preparing the review scope and materials.";
    case "analysis":
      return "We are completing the analysis. Please monitor this page for the final report and case conclusion.";
    case "delivered":
      return "Open the published report below and review the final conclusion for this case.";
    case "closed":
      return "This case is complete. Refer to your report and case conclusion if you need to revisit the outcome.";
    default:
      return "Please monitor this page for updates.";
  }
}

function getDecisionOutcomeText(status: string | null | undefined) {
  switch (status) {
    case "recommended":
      return "We recommend proceeding with this property.";
    case "watchlist":
      return "This case remains under consideration.";
    case "rejected_all":
      return "This case is not recommended for proceeding.";
    default:
      return null;
  }
}

function getDecisionSummaryFallback(status: string | null | undefined) {
  switch (status) {
    case "recommended":
      return "A final recommendation has been recorded for this case.";
    case "watchlist":
      return "This case remains on watchlist status pending further review.";
    case "rejected_all":
      return "No suitable property was approved for proceeding in this case.";
    default:
      return null;
  }
}

function getScreeningLabelTitle() {
  return "Screening / case label";
}

function getReviewFocusLabel() {
  return "Client objective";
}

function getSelectedServiceLabel() {
  return "Selected service";
}

function getBudgetLabel() {
  return "Budget";
}

function getScopeLabel() {
  return "Properties in scope";
}

function formatClientDateTime(value: string | null | undefined) {
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
};

export default async function DashboardCaseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/cases/${id}`);
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: caseItem, error: caseError } = await supabase
    .from("cases")
    .select(
      "id, screening_request_id, title, status, created_at, decision_status, decision_summary, recommended_property_id",
    )
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (caseError) {
    throw new Error(caseError.message);
  }

  if (!caseItem) {
    notFound();
  }

  const { data: screening, error: screeningError } =
    caseItem.screening_request_id
      ? await supabase
          .from("screening_requests")
          .select("id, name, goal, plan_interest, budget_range")
          .eq("id", caseItem.screening_request_id)
          .maybeSingle()
      : { data: null, error: null as null | Error };

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("case_properties")
    .select("id, title, address")
    .eq("case_id", caseItem.id);

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const recommendedProperty = properties?.find(
    (property) => property.id === caseItem.recommended_property_id,
  );

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("id, title, published, published_at, storage_path")
    .eq("case_id", caseItem.id)
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title={formatClientCaseTitle(caseItem.title)}
      description="Review the current status of this advisory engagement, the final case conclusion, the published report, and the next step expected from this case."
      counts={counts}
    >
      <section className="space-y-6">
        <div>
          <Link
            href="/dashboard/cases"
            className="inline-flex text-[11px] uppercase tracking-[0.2em] text-[#9a8660] transition hover:text-[#0f1c2e]"
          >
            ← Back to cases
          </Link>
        </div>

        {caseItem.decision_status && caseItem.decision_status !== "pending" ? (
          <section className="space-y-5 rounded-[24px] border border-[#dcc79e]/70 bg-[#fff8ea] p-6 shadow-[0_20px_60px_rgba(148,119,66,0.08)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#dcc79e] bg-white/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#9a6a16]">
                  Final conclusion
                </span>

                {formatDecisionStatusLabel(caseItem.decision_status) ? (
                  <span className="rounded-full border border-[#cfd9e8] bg-[#eef4fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#35506f]">
                    {formatDecisionStatusLabel(caseItem.decision_status)}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <h2 className="text-[20px] font-semibold text-[#0f1c2e]">
                  Case Conclusion
                </h2>

                {getDecisionOutcomeText(caseItem.decision_status) ? (
                  <p className="text-[13px] font-medium leading-6 text-[#4b5563]">
                    {getDecisionOutcomeText(caseItem.decision_status)}
                  </p>
                ) : null}
              </div>
            </div>

            {caseItem.decision_status === "recommended" &&
            recommendedProperty ? (
              <div className="rounded-2xl border border-[#eadfca] bg-white/80 p-4 text-[13px] text-[#6b7280]">
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                  Selected property
                </div>
                <div className="font-medium text-[#0f1c2e]">
                  {recommendedProperty.title ||
                    recommendedProperty.address ||
                    recommendedProperty.id}
                </div>
              </div>
            ) : null}

            {caseItem.decision_summary ? (
              <div className="whitespace-pre-line rounded-2xl border border-[#eadfca] bg-white/80 p-4 text-[13px] leading-6 text-[#6b7280]">
                {caseItem.decision_summary}
              </div>
            ) : getDecisionSummaryFallback(caseItem.decision_status) ? (
              <div className="rounded-2xl border border-[#eadfca] bg-white/80 p-4 text-[13px] leading-6 text-[#6b7280]">
                {getDecisionSummaryFallback(caseItem.decision_status)}
              </div>
            ) : null}
          </section>
        ) : null}

        <article className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                  {formatCaseStatusLabel(caseItem.status)}
                </span>
              </div>

              <div>
                <p className="text-[18px] font-semibold text-[#0f1c2e]">
                  {formatClientCaseTitle(caseItem.title)}
                </p>
                <p className="text-[13px] text-[#6b7280]">
                  Created {formatClientDateTime(caseItem.created_at)}
                </p>
              </div>
            </div>

            <div className="max-w-sm space-y-2 text-[13px] leading-6 text-[#6b7280] md:text-right">
              <div>{getCaseStageSummary(caseItem.status)}</div>
              <div className="text-[11px] text-[#9a8660]">
                This page reflects the formal progress of your case and will be
                updated as the engagement moves forward.
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                {getScopeLabel()}
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {properties && properties.length > 0
                  ? `${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                  : "No properties added yet"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                {getSelectedServiceLabel()}
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {screening?.plan_interest || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                {getBudgetLabel()}
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {screening?.budget_range || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4 md:col-span-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                {getScreeningLabelTitle()}
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {screening?.name || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4 md:col-span-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                {getReviewFocusLabel()}
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {screening?.goal || "—"}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#dcc79e] bg-[#fff8ea] p-4 md:col-span-2 xl:col-span-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a6a16]">
                Next step
              </dt>
              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {getCaseNextStep(caseItem.status)}
              </dd>
              <div className="mt-2 text-[11px] leading-5 text-[#9a8660]">
                This guidance reflects the current stage of the case and will
                change only when the case itself moves forward.
              </div>
            </div>
          </div>
        </article>

        <section className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <h2 className="text-[20px] font-semibold text-[#0f1c2e]">
            Case Reports
          </h2>

          {reports && reports.length > 0 ? (
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Open the published report for the full written analysis and
              supporting detail.
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-[#6b7280]">
              The written report will appear here once the analysis is completed
              and the report is formally published to your portal.
            </p>
          )}

          <div className="mt-4 space-y-4">
            {reports && reports.length > 0 ? (
              reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-[#eadfca] bg-white/70 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-[#0f1c2e]">
                        {report.title}
                      </p>
                      <p className="text-[11px] text-[#9a8660]">
                        Published {formatClientDateTime(report.published_at)}
                      </p>
                    </div>

                    {report.storage_path ? (
                      <a
                        href={`/api/reports/${report.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                      >
                        Open Report
                      </a>
                    ) : (
                      <span className="rounded-xl border border-[#dcc79e]/70 px-4 py-2 text-xs text-[#9a8660]">
                        Report pending
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4 text-[13px] leading-6 text-[#6b7280]">
                No published report is available yet. This usually means the
                analysis is still in progress or the final report has not been
                delivered to the client portal yet.
              </div>
            )}
          </div>
        </section>
      </section>
    </ClientPortalShell>
  );
}
