import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import {
  formatRecommendedPlan,
  formatTriageResult,
} from "@/lib/intake/clientDecision";
import { deleteOwnScreeningRequest } from "./deleteScreeningRequest";

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    new: "Submitted",
    accepted: "Accepted",
    rejected: "Rejected",
    offer_sent: "Offer sent",
  };

  return labels[status] ?? status;
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

function getStatusHelp(status: string | null | undefined) {
  switch (status) {
    case "new":
      return "Awaiting review";
    case "accepted":
      return "Accepted for next step";
    case "offer_sent":
      return "Commercial offer already issued";
    case "rejected":
      return "Reviewed but not accepted";
    default:
      return "In progress";
  }
}

export default async function DashboardScreeningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: screeningRequests, error } = await supabase
    .from("screening_requests")
    .select(
      "id, name, status, created_at, triage_result, recommended_plan, primary_blocker",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Screenings"
      description="Track submitted screening requests, review recommendations, and see the next relevant step."
      counts={counts}
    >
      <div className="space-y-6">
        {error ? (
          <div className="border border-white/10 px-5 py-5 text-sm text-[#6a7080]">
            Screening requests could not be loaded right now.
          </div>
        ) : screeningRequests && screeningRequests.length > 0 ? (
          <section className="space-y-4">
            {screeningRequests.map((request) => {
              const canDelete = request.status === "new";
              const hasDecision =
                !!request.triage_result || !!request.recommended_plan;

              return (
                <article
                  key={request.id}
                  className="group rounded-[24px] border border-[#eadfca] bg-white/70 p-5 shadow-[0_18px_48px_rgba(148,119,66,0.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fffaf2]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#9a6a16]">
                          {formatStatusLabel(request.status)}
                        </span>

                        {request.recommended_plan ? (
                          <span className="inline-flex rounded-full border border-[#dcc79e] bg-[#fff8ea] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8b6d35]">
                            {formatRecommendedPlan(request.recommended_plan)}
                          </span>
                        ) : null}

                        {request.triage_result ? (
                          <span className="inline-flex rounded-full border border-[#eadfca] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#756b59]">
                            {formatTriageResult(request.triage_result)}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[16px] font-semibold text-[#0f1c2e]">
                          {request.name || "Screening request"}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8b7a5c]">
                          {getStatusHelp(request.status)}
                        </p>
                      </div>
                    </div>

                    <div className="text-[13px] text-[#6b7280]">
                      {formatClientDate(request.created_at)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr_auto] md:items-start">
                    <div className="rounded-2xl border border-[#eadfca] bg-[#fffdf8] p-4">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                        Decision view
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                        {hasDecision
                          ? "A recommendation is available for this screening. Open it to see the decision and the suggested next step."
                          : "This screening is still under internal review. The recommendation will appear here once the review is complete."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#eadfca] bg-[#fffdf8] p-4">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                        Primary blocker
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-[#5f6675]">
                        {request.primary_blocker || "—"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link
                        href={`/dashboard/screening/${request.id}`}
                        className="inline-flex items-center rounded-xl border border-[#dcc79e]/70 bg-white/70 px-4 py-2 text-xs text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
                      >
                        Open
                      </Link>

                      {canDelete ? (
                        <form
                          action={deleteOwnScreeningRequest.bind(null, request.id)}
                        >
                          <ConfirmSubmitButton
                            confirmMessage="Delete this screening request? This cannot be undone."
                            className="border border-red-400/20 px-3 py-2 text-[11px] text-red-400/75 transition hover:bg-red-500/10"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="py-8">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No screening requests found.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Screening is the required first step before any offer, payment, or
              case creation.
            </p>

            <div className="mt-5">
              <Link
                href="/readiness-check"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Start Readiness Check
              </Link>
            </div>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}