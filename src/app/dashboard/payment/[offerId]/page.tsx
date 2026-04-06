import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
}

function formatPaymentStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  return labels[status] ?? status;
}

type PageProps = {
  params: Promise<{
    offerId: string;
  }>;
};

export default async function PaymentPlaceholderPage({ params }: PageProps) {
  const { offerId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/payment/${offerId}`);
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select(
      "id, screening_request_id, plan_type, price_amount, currency, status, created_at",
    )
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    throw new Error(offerError.message);
  }

  if (!offer) {
    notFound();
  }

  const { data: screening, error: screeningError } = await supabase
    .from("screening_requests")
    .select("id, user_id")
    .eq("id", offer.screening_request_id)
    .maybeSingle();

  if (screeningError) {
    throw new Error(screeningError.message);
  }

  if (!screening || screening.user_id !== user.id) {
    notFound();
  }

  if (offer.status !== "accepted") {
    redirect(`/dashboard/offers/${offer.id}`);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, amount, currency, payment_status, payment_provider, payment_reference, created_at, updated_at",
    )
    .eq("offer_id", offer.id)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    throw new Error(
      "Payment placeholder order is missing. Apply Step 29 migration and verify accepted-offer backfill.",
    );
  }

  const isPaid = order.payment_status === "paid";

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Payment Status"
      description="This page shows the current payment status for your accepted offer. Payment confirmation is handled manually at this stage."
      counts={counts}
    >
      <section className="max-w-4xl space-y-6">
        <div>
          <Link
            href="/dashboard/payments"
            className="inline-flex text-[11px] uppercase tracking-[0.2em] text-[#9a8660] transition hover:text-[#0f1c2e]"
          >
            ← Back to payments
          </Link>
        </div>

        <article className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Offer status
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">Accepted</dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Selected Plan
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {formatPlanLabel(offer.plan_type)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Amount due
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {order.amount} {order.currency}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Payment status
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {formatPaymentStatusLabel(order.payment_status)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Payment method
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                Manual confirmation
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Payment reference
              </dt>
              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {order.payment_reference || "—"}
              </dd>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#dcc79e] bg-[#fff8ea] p-6 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a6a16]">
              {isPaid ? "Payment confirmed" : "Payment pending"}
            </p>

            {isPaid ? (
              <p className="text-[13px] leading-6 text-[#6b7280]">
                Your payment has been marked as confirmed. Your case has now
                been created and will appear in your client portal.
              </p>
            ) : (
              <>
                <p className="text-[13px] leading-6 text-[#6b7280]">
                  Online payment is not connected yet.
                </p>

                <p className="text-[13px] leading-6 text-[#6b7280]">
                  Payment is confirmed manually. Your case will appear
                  automatically after payment is marked as paid.
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/payments"
              className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
            >
              Back to Payments
            </Link>

            {isPaid ? (
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Open My Cases
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
            >
              Back to Dashboard
            </Link>
          </div>
        </article>
      </section>
    </ClientPortalShell>
  );
}
