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

function getSoftStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "delivered":
      return "border-emerald-400/35 bg-emerald-500/10 text-emerald-900";
    case "analysis":
      return "border-amber-400/35 bg-amber-500/10 text-amber-900";
    case "closed":
      return "border-[#d8cab8] bg-[#ece2d5] text-[#6c5f51]";
    default:
      return "border-[#d8cab8] bg-[#efe6da] text-[#6c5f51]";
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
      description="Follow each active or completed engagement, review its current status, and open the case workspace when you need detail."
      counts={counts}
    >
      <div className="space-y-6">
        {cases && cases.length > 0 ? (
          <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-4 py-4 md:px-6 md:py-5">
            <div className="flex items-end justify-between gap-4 border-b border-[#e3d6c6] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                  Engagements
                </p>
                <h2
                  className="mt-3 text-3xl leading-none text-[#211b15]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  All cases
                </h2>
              </div>

              <div className="rounded-full border border-[#d8cab8] bg-white/70 px-3 py-1 text-xs font-medium text-[#6e6255]">
                {cases.length}
              </div>
            </div>

            <div className="mt-2 hidden grid-cols-[minmax(0,1.3fr)_110px_150px_140px_180px_110px] gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#8f7d68] xl:grid">
              <div>Case</div>
              <div>Date</div>
              <div>Selected plan</div>
              <div>Budget</div>
              <div>Review focus</div>
              <div className="text-right">Status</div>
            </div>

            <div className="space-y-2">
              {cases.map((item) => {
                const screening = item.screening_request_id
                  ? screeningsById.get(item.screening_request_id)
                  : null;

                return (
                  <article
                    key={item.id}
                    className="relative rounded-[22px] border border-transparent bg-white/55 px-4 py-4 transition hover:border-[#d8cab8] hover:bg-white"
                  >
                    <Link
                      href={`/dashboard/cases/${item.id}`}
                      className="absolute inset-0 z-10 rounded-[22px]"
                      aria-label={`Open ${formatClientCaseTitle(item.title)}`}
                    />

                    <div className="relative z-0 flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.3fr)_110px_150px_140px_180px_110px] xl:items-center xl:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[#211b15]">
                            {formatClientCaseTitle(item.title)}
                          </p>

                          {formatDecisionStatusLabel(item.decision_status) ? (
                            <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                              {formatDecisionStatusLabel(item.decision_status)}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs text-[#8f7d68]">
                          {getCaseListStatusText(item.status)}
                        </p>
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {formatClientDate(item.created_at)}
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {screening?.plan_interest
                          ? screening.plan_interest === "core"
                            ? "Core Analysis"
                            : screening.plan_interest === "strategic"
                              ? "Strategic Analysis"
                              : screening.plan_interest
                          : "—"}
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {screening?.budget_range || "—"}
                      </div>

                      <div className="truncate text-sm text-[#6e6255]">
                        {screening?.goal || "—"}
                      </div>

                      <div className="flex justify-start xl:justify-end">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            getSoftStatusClasses(item.status),
                          ].join(" ")}
                        >
                          {formatCaseStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-5 py-8 md:px-6">
            <p
              className="text-3xl leading-none text-[#211b15]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              No cases available yet.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#6e6255]">
              Your case will appear here after payment is confirmed and the
              review begins.
            </p>

            <p className="mt-2 text-sm leading-7 text-[#6e6255]">
              Once available, each case will show its status, conclusion, and
              final report access.
            </p>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}
