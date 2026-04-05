import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";
import { acceptOffer } from "./acceptOffer";

function formatPlanLabel(planType: string | null | undefined) {
  if (!planType) return "—";
  if (planType === "core") return "Core Analysis";
  if (planType === "strategic") return "Strategic Analysis";
  return planType;
}

function formatStatusLabel(status: string | null | undefined) {
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

function getOfferStageTitle({
  isSent,
  isAccepted,
  paymentPending,
  paymentPaid,
}: {
  isSent: boolean;
  isAccepted: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
}) {
  if (isAccepted && paymentPaid) {
    return "Current stage";
  }

  if (isAccepted && paymentPending) {
    return "Next expected step";
  }

  if (isSent) {
    return "What you should do now";
  }

  return "Offer status";
}

function getOfferStageText({
  isSent,
  isAccepted,
  paymentPending,
  paymentPaid,
}: {
  isSent: boolean;
  isAccepted: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
}) {
  if (isAccepted && paymentPaid) {
    return "Your payment has been confirmed and your case is now open in the client portal.";
  }

  if (isAccepted && paymentPending) {
    return "Your offer has already been accepted. Payment is currently awaiting confirmation from the admin side.";
  }

  if (isSent) {
    return "Review the offer, confirm that you want to proceed, and then move into the payment confirmation stage.";
  }

  return "This offer is not currently actionable from the client area.";
}

function getOfferActionChecklist({
  isSent,
  isAccepted,
  paymentPending,
  paymentPaid,
}: {
  isSent: boolean;
  isAccepted: boolean;
  paymentPending: boolean;
  paymentPaid: boolean;
}) {
  if (isAccepted && paymentPaid) {
    return [
      "Your offer is already accepted.",
      "Your payment is already confirmed.",
      "Your case is now available in the client portal.",
    ];
  }

  if (isAccepted && paymentPending) {
    return [
      "Your offer is already accepted.",
      "Payment is awaiting confirmation.",
      "Your case will appear automatically after payment is confirmed.",
    ];
  }

  if (isSent) {
    return [
      "Review the selected plan and total price.",
      "Accept the offer only if you want to proceed.",
      "After acceptance, payment confirmation is handled before the case is opened.",
    ];
  }

  return ["This offer is not currently actionable from the client area."];
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OfferPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: offer, error } = await supabase
    .from("offers")
    .select(
      "id, screening_request_id, plan_type, price_amount, currency, status, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("offer_id", offer.id)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const isSent = offer.status === "sent";
  const isAccepted = offer.status === "accepted";

  const paymentPending = order?.payment_status === "pending";
  const paymentPaid = order?.payment_status === "paid";

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Your Offer"
      description="Review your offer and continue with the next available step."
      counts={counts}
    >
      <section className="max-w-4xl space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex text-[11px] uppercase tracking-[0.2em] text-[#9a8660] transition hover:text-[#0f1c2e]"
          >
            ← Back to dashboard
          </Link>
        </div>

        <article className="rounded-[24px] border border-[#dcc79e]/70 bg-white/55 p-6 shadow-[0_20px_60px_rgba(148,119,66,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex min-w-[118px] justify-center rounded-full border border-[#d6b67a] bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9a6a16] shadow-sm">
                  {formatStatusLabel(offer.status)}
                </span>
              </div>

              <div>
                <p className="text-xl font-semibold text-[#0f1c2e]">
                  {formatPlanLabel(offer.plan_type)}
                </p>

                <p className="text-[13px] text-[#6b7280]">
                  Review the offer terms, understand the current step, and
                  confirm whether you want to proceed with this engagement.
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Total price
              </div>

              <div className="mt-2 text-3xl font-bold text-[#0f1c2e]">
                {offer.price_amount} {offer.currency}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
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
                Offer status
              </dt>

              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {formatStatusLabel(offer.status)}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#eadfca] bg-white/70 p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                Created
              </dt>

              <dd className="mt-1 text-[13px] text-[#6b7280]">
                {new Date(offer.created_at).toLocaleString()}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#dcc79e] bg-[#fff8ea] p-4">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[#9a6a16]">
                {getOfferStageTitle({
                  isSent,
                  isAccepted,
                  paymentPending,
                  paymentPaid,
                })}
              </dt>

              <dd className="mt-1 text-[13px] leading-6 text-[#6b7280]">
                {getOfferStageText({
                  isSent,
                  isAccepted,
                  paymentPending,
                  paymentPaid,
                })}
              </dd>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-[#eadfca] bg-white/70 p-6">
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a8660]">
                  {isAccepted
                    ? paymentPaid
                      ? "Payment confirmed"
                      : "Offer accepted"
                    : isSent
                      ? "What acceptance means"
                      : "Offer status"}
                </p>
              </div>

              {isSent ? (
                <p className="text-[13px] leading-6 text-[#6b7280]">
                  Accepting this offer confirms that you want to proceed with
                  this advisory engagement under the selected plan and price. It
                  does not mean your case is already open yet. The case becomes
                  available in the portal only after payment is confirmed.
                </p>
              ) : isAccepted ? (
                paymentPaid ? (
                  <p className="text-[13px] leading-6 text-[#6b7280]">
                    Your payment has been confirmed. Your case is now available
                    in the client portal and you can continue from the cases
                    section.
                  </p>
                ) : (
                  <p className="text-[13px] leading-6 text-[#6b7280]">
                    Your offer has already been accepted. Payment is currently
                    awaiting confirmation. No additional action is required from
                    you on this page right now.
                  </p>
                )
              ) : (
                <p className="text-[13px] leading-6 text-[#6b7280]">
                  This offer is not currently actionable from the client area.
                </p>
              )}

              <div className="rounded-2xl border border-[#eadfca] bg-white/75 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#9a8660]">
                  Step summary
                </div>

                <div className="mt-3 space-y-2">
                  {getOfferActionChecklist({
                    isSent,
                    isAccepted,
                    paymentPending,
                    paymentPaid,
                  }).map((item) => (
                    <div
                      key={item}
                      className="text-[13px] leading-6 text-[#6b7280]"
                    >
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {isSent ? (
                <form action={acceptOffer.bind(null, offer.id)}>
                  <button
                    type="submit"
                    className="rounded-xl border border-[#b8935c] bg-[#0f1c2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#16304f]"
                  >
                    Accept and Continue
                  </button>
                </form>
              ) : null}

              {isAccepted && paymentPending ? (
                <div className="rounded-xl border border-[#dcc79e] bg-[#fff8ea] px-6 py-3 text-sm text-[#9a6a16]">
                  Payment confirmation pending
                </div>
              ) : null}

              {isAccepted && paymentPaid ? (
                <>
                  <div className="rounded-xl border border-[#cfe0c8] bg-[#edf6e8] px-6 py-3 text-sm text-[#57714e]">
                    Payment confirmed
                  </div>

                  <Link
                    href="/dashboard/cases"
                    className="rounded-xl border border-[#dcc79e]/70 bg-white/70 px-6 py-3 text-sm text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
                  >
                    Open My Cases
                  </Link>
                </>
              ) : null}

              <Link
                href="/dashboard"
                className="rounded-xl border border-[#dcc79e]/70 bg-white/70 px-6 py-3 text-sm text-[#6b7280] transition hover:bg-[#fffaf0] hover:text-[#0f1c2e]"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </article>
      </section>
    </ClientPortalShell>
  );
}
