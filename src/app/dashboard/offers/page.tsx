import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
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
    draft: "Draft",
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
  if (Number.isNaN(date.getTime())) return "—";
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

  if (!user) redirect("/auth/login");

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: screeningRequests } = await supabase
    .from("screening_requests")
    .select("id")
    .eq("user_id", user.id);

  const screeningIds = screeningRequests?.map((r) => r.id) ?? [];

  const { data: offers, error } =
    screeningIds.length > 0
      ? await supabase
          .from("offers")
          .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at",
          )
          .in("screening_request_id", screeningIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Offers"
      description="Commercial proposals issued after screening review."
      counts={counts}
    >
      <div className="space-y-8">
        {error ? (
          <p className="text-sm text-[#6a7080]">Offers could not be loaded.</p>
        ) : offers && offers.length > 0 ? (
          <section>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <p className="text-[9px] uppercase tracking-[0.35em] text-[#4a5060]">
                All Offers
              </p>
              <span className="border border-white/10 px-3 py-1 text-xs text-[#6a7080]">
                {offers.length}
              </span>
            </div>

            <div className="hidden grid-cols-[110px_minmax(0,1fr)_140px_110px] gap-6 px-2 py-3 text-[9px] uppercase tracking-[0.35em] text-[#4a5060] md:grid">
              <div>Date</div>
              <div>Plan</div>
              <div>Amount</div>
              <div className="text-right">Status</div>
            </div>

            <div>
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="border-b border-white/[0.07] transition hover:bg-white/[0.02]"
                >
                  <Link
                    href={`/dashboard/offers/${offer.id}`}
                    className="grid min-w-0 items-center gap-4 px-2 py-4 md:grid-cols-[110px_minmax(0,1fr)_140px_110px] md:gap-6"
                  >
                    <div className="text-sm text-[#6a7080]">
                      {formatClientDate(offer.created_at)}
                    </div>
                    <div className="truncate text-[14px] font-medium text-[#f0e6d3]">
                      {formatPlanLabel(offer.plan_type)}
                    </div>
                    <div className="text-sm text-[#9aa0ad]">
                      {offer.price_amount
                        ? `${offer.currency ?? "EUR"} ${Number(offer.price_amount).toLocaleString("en-GB")}`
                        : "—"}
                    </div>
                    <div className="flex justify-start md:justify-end">
                      <span className="inline-flex border border-[#b8935c]/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#d6b26b]">
                        {formatOfferStatus(offer.status)}
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="py-8">
            <p
              className="text-2xl leading-none text-[#f0e6d3]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No offers yet.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6a7080]">
              Offers are issued after your screening request has been reviewed
              and accepted.
            </p>
          </div>
        )}
      </div>
    </ClientPortalShell>
  );
}
