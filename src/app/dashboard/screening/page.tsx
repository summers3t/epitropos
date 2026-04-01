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
    new: "New",
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

function getSoftStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "accepted":
      return "border-emerald-400/35 bg-emerald-500/10 text-emerald-900";
    case "offer_sent":
      return "border-amber-400/35 bg-amber-500/10 text-amber-900";
    case "rejected":
      return "border-[#d8cab8] bg-[#ece2d5] text-[#6c5f51]";
    default:
      return "border-[#d8cab8] bg-[#efe6da] text-[#6c5f51]";
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
      description="Track submitted screening requests, review their status, and move into the next step when the engagement advances."
      counts={counts}
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[24px] border border-[#d8cab8] bg-[#fbf7f1] px-5 py-5 text-sm text-[#6e6255]">
            Screening requests could not be loaded right now.
          </div>
        ) : screeningRequests && screeningRequests.length > 0 ? (
          <section className="rounded-[28px] border border-[#d8cab8] bg-[#fbf7f1] px-4 py-4 md:px-6 md:py-5">
            <div className="flex items-end justify-between gap-4 border-b border-[#e3d6c6] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7d68]">
                  Screening history
                </p>
                <h2
                  className="mt-3 text-3xl leading-none text-[#211b15]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  All screening requests
                </h2>
              </div>

              <div className="rounded-full border border-[#d8cab8] bg-white/70 px-3 py-1 text-xs font-medium text-[#6e6255]">
                {screeningRequests.length}
              </div>
            </div>

            <div className="mt-2 hidden grid-cols-[minmax(0,1.25fr)_110px_150px_140px_180px_110px_96px] gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[#8f7d68] xl:grid">
              <div>Screening</div>
              <div>Date</div>
              <div>Selected plan</div>
              <div>Budget</div>
              <div>Review focus</div>
              <div className="text-right">Status</div>
              <div className="text-right">Action</div>
            </div>

            <div className="space-y-2">
              {screeningRequests.map((request) => {
                const canDelete = ["new"].includes(request.status ?? "");

                return (
                  <article
                    key={request.id}
                    className="relative rounded-[22px] border border-transparent bg-white/55 px-4 py-4 transition hover:border-[#d8cab8] hover:bg-white"
                  >
                    <Link
                      href={`/dashboard/screening/${request.id}`}
                      className="absolute inset-0 z-10 rounded-[22px]"
                      aria-label={`Open ${request.name || "screening request"}`}
                    />

                    <div className="relative z-0 flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.25fr)_110px_150px_140px_180px_110px_96px] xl:items-center xl:gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#211b15]">
                          {request.name || "Screening request"}
                        </p>
                        <p className="mt-1 text-xs text-[#8f7d68]">
                          {getStatusHelp(request.status)}
                        </p>
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {formatClientDate(request.created_at)}
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {request.plan_interest
                          ? formatPlanLabel(request.plan_interest)
                          : "—"}
                      </div>

                      <div className="text-sm text-[#6e6255]">
                        {request.budget_range || "—"}
                      </div>

                      <div className="truncate text-sm text-[#6e6255]">
                        {request.goal || "—"}
                      </div>

                      <div className="flex justify-start xl:justify-end">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            getSoftStatusClasses(request.status),
                          ].join(" ")}
                        >
                          {formatStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="flex justify-start xl:justify-end">
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
                              className="rounded-full border border-red-400/30 px-4 py-2 text-xs text-red-700 transition hover:bg-red-500/10"
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <span className="text-xs text-[#8f7d68]">—</span>
                        )}
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
              No screening requests found.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#6e6255]">
              Screening is the required first step before any offer, payment, or
              case creation.
            </p>

            <div className="mt-6">
              <Link
                href="/screening"
                className="inline-flex items-center rounded-full border border-[#2c241c] px-5 py-2.5 text-sm text-[#211b15] transition hover:bg-[#211b15] hover:text-white"
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
