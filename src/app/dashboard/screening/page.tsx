import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
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

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
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
      return "Accepted for offer preparation";
    case "offer_sent":
      return "Offer already issued";
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
      "id, name, status, created_at, budget_range, financing_type, goal, plan_interest",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Screenings"
      description="Track submitted screening requests and review the next relevant step."
      counts={counts}
    >
      <div className="space-y-8">
        {error ? (
          <div className="border border-white/10 px-5 py-5 text-sm text-[#8f95a2]">
            Screening requests could not be loaded right now.
          </div>
        ) : screeningRequests && screeningRequests.length > 0 ? (
          <section className="min-w-0">
            <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
                  Screening History
                </p>
              </div>

              <div className="border border-white/10 px-3 py-1 text-xs text-[#8f95a2]">
                {screeningRequests.length}
              </div>
            </div>

            <div className="hidden grid-cols-[110px_170px_150px_minmax(0,1fr)_120px_110px] gap-6 px-2 py-4 text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad] xl:grid">
              <div>Date</div>
              <div>Selected Plan</div>
              <div>Budget</div>
              <div>Review Focus</div>
              <div className="text-right">Status</div>
              <div className="text-right">Action</div>
            </div>

            <div className="space-y-0">
              {screeningRequests.map((request) => {
                const canDelete = ["new"].includes(request.status ?? "");

                return (
                  <article
                    key={request.id}
                    className="border-b border-white/10 px-2 py-5 transition hover:bg-white/[0.02]"
                  >
                    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_110px_170px_150px_minmax(0,1fr)_120px_110px] xl:items-center xl:gap-6">
                      <Link
                        href={`/dashboard/screening/${request.id}`}
                        className="min-w-0 xl:order-1"
                      >
                        <p className="truncate text-[15px] font-semibold text-[#f3e7d8]">
                          {request.name || "Screening request"}
                        </p>
                        <p className="mt-1 text-xs text-[#8f95a2]">
                          {getStatusHelp(request.status)}
                        </p>
                      </Link>

                      <div className="text-sm text-[#9aa0ad] xl:order-2">
                        {formatClientDate(request.created_at)}
                      </div>

                      <div className="truncate text-sm text-[#9aa0ad] xl:order-3">
                        {request.plan_interest
                          ? formatPlanLabel(request.plan_interest)
                          : "—"}
                      </div>

                      <div className="text-sm text-[#9aa0ad] xl:order-4">
                        {request.budget_range || "—"}
                      </div>

                      <div className="truncate text-sm text-[#9aa0ad] xl:order-5">
                        {request.goal || "—"}
                      </div>

                      <div className="flex justify-start xl:order-6 xl:justify-end">
                        <span className="inline-flex border border-[#b8935c] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#d6b26b]">
                          {formatStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="flex justify-start xl:order-7 xl:justify-end">
                        {canDelete ? (
                          <form
                            action={deleteOwnScreeningRequest.bind(
                              null,
                              request.id,
                            )}
                            className="relative z-20"
                          >
                            <ConfirmSubmitButton
                              confirmMessage="Delete this screening request? This cannot be undone."
                              className="relative z-20 border border-red-400/30 px-4 py-2 text-xs text-red-300 transition hover:bg-red-500/10"
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <span className="text-xs text-[#6f7682]">—</span>
                        )}
                      </div>
                    </div>
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
              No screening requests found.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#8f95a2]">
              Screening is the required first step before any offer, payment, or
              case creation.
            </p>

            <div className="mt-6">
              <Link
                href="/screening"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Apply for Screening
              </Link>
            </div>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}
