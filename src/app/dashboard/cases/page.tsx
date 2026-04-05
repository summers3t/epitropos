import Link from "next/link";
import { redirect } from "next/navigation";
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
  if (!title) return "Case";

  return title.startsWith("Case for ")
    ? title.slice("Case for ".length)
    : title;
}

function formatDecisionStatusLabel(status: string | null | undefined) {
  if (!status || status === "pending") return null;

  const labels: Record<string, string> = {
    recommended: "Recommended",
    watchlist: "Watchlist",
    rejected_all: "Not recommended",
  };

  return labels[status] ?? null;
}

function formatClientDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
}

function getCaseListStatusText(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "Review preparation in progress";
    case "analysis":
      return "Analysis in progress";
    case "delivered":
      return "Report available";
    case "closed":
      return "Case completed";
    default:
      return "Case in progress";
  }
}

export default async function DashboardCasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/cases");
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select(
      "id, title, status, created_at, decision_status, screening_request_id",
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (casesError) {
    throw new Error(casesError.message);
  }

  const screeningIds = (cases ?? [])
    .map((item) => item.screening_request_id)
    .filter(Boolean) as string[];

  const { data: screenings, error: screeningsError } =
    screeningIds.length > 0
      ? await supabase
          .from("screening_requests")
          .select("id, name, budget_range, goal, plan_interest")
          .in("id", screeningIds)
      : { data: [], error: null as null | Error };

  if (screeningsError) {
    throw new Error(screeningsError.message);
  }

  const screeningsById = new Map(
    (screenings ?? []).map((item) => [item.id, item]),
  );

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Cases"
      description="Follow each active or completed engagement and open the case workspace when you need detail."
      counts={counts}
    >
      <div className="space-y-8">
        {cases && cases.length > 0 ? (
          <section className="min-w-0">
            <div className="hidden grid-cols-[minmax(0,1fr)_1fr_1fr_1fr_1fr_160px] gap-6 px-2 py-3 text-[10px] uppercase tracking-[0.32em] text-[#9a8660] xl:grid">
              <div>Case</div>
              <div>Date</div>
              <div>Plan</div>
              <div>Budget</div>
              <div>Goal</div>
              <div className="text-right">Status</div>
            </div>

            <div className="space-y-0">
              {cases.map((item) => {
                const screening = item.screening_request_id
                  ? screeningsById.get(item.screening_request_id)
                  : null;

                return (
                  <article
                    key={item.id}
                    className="border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                  >
                    <Link
                      href={`/dashboard/cases/${item.id}`}
                      className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_1fr_1fr_1fr_1fr_160px] xl:items-center xl:gap-6"
                    >
                      <div className="min-w-0 xl:order-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-semibold text-[#0f1c2e]">
                            {formatClientCaseTitle(item.title)}
                          </p>

                          {formatDecisionStatusLabel(item.decision_status) ? (
                            <span className="inline-flex rounded-full border border-[#cfd9e8] bg-[#eef4fb] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#35506f]">
                              {formatDecisionStatusLabel(item.decision_status)}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-[11px] text-[#8b7a5c]">
                          {getCaseListStatusText(item.status)}
                        </p>
                      </div>

                      <div className="text-[13px] text-[#6b7280] xl:order-2">
                        {formatClientDate(item.created_at)}
                      </div>

                      <div className="text-[13px] text-[#6b7280] xl:order-3">
                        {screening?.plan_interest
                          ? formatPlanLabel(screening.plan_interest)
                          : "—"}
                      </div>

                      <div className="text-[13px] text-[#6b7280] xl:order-4">
                        {screening?.budget_range || "—"}
                      </div>

                      <div className="text-[13px] text-[#6b7280] xl:order-5">
                        {screening?.goal || "—"}
                      </div>

                      <div className="flex justify-start xl:order-6 xl:justify-center">
                        <div className="flex w-full justify-start xl:justify-center">
                          <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                            {formatCaseStatusLabel(item.status)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="border border-white/10 px-5 py-8">
            <p
              className="text-3xl leading-none text-[#f3e7d8]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              No cases available yet.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#8f95a2]">
              Your case will appear here after payment is confirmed and the
              review begins.
            </p>

            <p className="mt-2 text-sm leading-7 text-[#8f95a2]">
              Once available, each case will show its status, conclusion, and
              final report access.
            </p>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}
