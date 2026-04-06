import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
}

function formatOfferStatus(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    sent: "Sent",
    accepted: "Accepted",
    expired: "Expired",
    cancelled: "Cancelled",
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

export default async function DashboardOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: screeningRequests, error: screeningError } = await supabase
    .from("screening_requests")
    .select("id")
    .eq("user_id", user.id);

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  const screeningIds = screeningRequests?.map((item) => item.id) ?? [];

  const { data: offers, error: offersError } =
    screeningIds.length > 0
      ? await supabase
          .from("offers")
          .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at",
          )
          .in("screening_request_id", screeningIds)
          .in("status", ["sent", "accepted", "expired", "cancelled"])
          .order("created_at", { ascending: false })
      : { data: [], error: null as null | Error };

  if (offersError) {
    throw new Error(offersError.message);
  }

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Offers"
      description="Commercial proposals issued after screening review."
      counts={counts}
    >
      <div className="space-y-6">
        {offers && offers.length > 0 ? (
          <section className="min-w-0">
            <div className="hidden grid-cols-[1fr_1fr_1fr_160px] gap-6 px-2 py-3 text-[10px] uppercase tracking-[0.32em] text-[#9a8660] md:grid">
              <div>Date</div>
              <div>Plan</div>
              <div>Amount</div>
              <div className="text-center">Status</div>
            </div>

            <div className="space-y-0">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="border-b border-[#eadfca] transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                >
                  <Link
                    href={`/dashboard/offers/${offer.id}`}
                    className="grid min-w-0 items-center gap-4 px-2 py-4 md:grid-cols-[1fr_1fr_1fr_160px] md:gap-6"
                  >
                    <div className="text-[13px] text-[#6b7280]">
                      {formatClientDate(offer.created_at)}
                    </div>

                    <div className="truncate text-[14px] font-semibold text-[#0f1c2e]">
                      {formatPlanLabel(offer.plan_type)}
                    </div>

                    <div className="text-[13px] text-[#6b7280]">
                      {offer.price_amount
                        ? `${offer.currency ?? "EUR"} ${Number(offer.price_amount).toLocaleString("en-GB")}`
                        : "—"}
                    </div>

                    <div className="flex justify-start md:justify-center">
                      <div className="flex w-full justify-start md:justify-center">
                        <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                          {formatOfferStatus(offer.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="py-8">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No offers yet.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Offers are issued after your screening request has been reviewed
              and accepted.
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
