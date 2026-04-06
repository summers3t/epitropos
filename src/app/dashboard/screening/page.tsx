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
  if (planType === "core") return "Core";
  if (planType === "strategic") return "Strategic";
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
      <div className="space-y-6">
        {error ? (
          <div className="border border-white/10 px-5 py-5 text-sm text-[#6a7080]">
            Screening requests could not be loaded right now.
          </div>
        ) : screeningRequests && screeningRequests.length > 0 ? (
          <section className="min-w-0">
            <div className="hidden grid-cols-[minmax(0,1fr)_1fr_1fr_1fr_1fr_160px_110px] gap-6 px-2 py-3 text-[10px] uppercase tracking-[0.32em] text-[#9a8660] xl:grid">
              <div>Name</div>
              <div>Date</div>
              <div>Plan</div>
              <div>Budget</div>
              <div>Goal</div>
              <div className="text-center">Status</div>
              <div className="text-center">Action</div>
            </div>

            <div>
              {screeningRequests.map((request) => {
                const canDelete = request.status === "new";

                return (
                  <article
                    key={request.id}
                    className="relative border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                  >
                    <Link
                      href={`/dashboard/screening/${request.id}`}
                      className="absolute inset-0 z-10"
                      aria-label={`Open ${request.name || "screening request"}`}
                    />

                    <div className="grid min-w-0 items-center gap-4 xl:grid-cols-[minmax(0,1fr)_1fr_1fr_1fr_1fr_160px_110px] xl:gap-6">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#0f1c2e]">
                          {request.name || "Screening request"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8b7a5c]">
                          {getStatusHelp(request.status)}
                        </p>
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {formatClientDate(request.created_at)}
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {request.plan_interest
                          ? formatPlanLabel(request.plan_interest)
                          : "—"}
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {request.budget_range || "—"}
                      </div>

                      <div className="text-[13px] text-[#6b7280]">
                        {request.goal || "—"}
                      </div>

                      <div className="flex justify-start xl:justify-center">
                        <div className="flex w-full justify-start xl:justify-center">
                          <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                            {formatStatusLabel(request.status)}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-20 flex justify-start xl:justify-center">
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
                              className="relative z-20 border border-red-400/20 px-3 py-1.5 text-[11px] text-red-400/70 transition hover:bg-red-500/10"
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <span className="text-[11px] text-[#3a4050]">—</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
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
