import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

    return [
        "This offer is not currently actionable from the client area.",
    ];
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

    const { data: offer, error } = await supabase
        .from("offers")
        .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at"
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
        <section className="space-y-8 max-w-4xl">
            <div className="space-y-3">
                <Link
                    href="/dashboard"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to dashboard
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Your Offer
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-white/72">
                    Review your offer and continue with the next available step.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                {formatStatusLabel(offer.status)}
                            </span>
                        </div>

                        <div>
                            <p className="text-xl font-semibold text-white">
                                {formatPlanLabel(offer.plan_type)}
                            </p>

                            <p className="text-sm text-white/70">
                                Review the offer terms, understand the current step, and confirm whether you want to proceed with this engagement.
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Total price
                        </div>

                        <div className="mt-2 text-3xl font-bold text-white">
                            {offer.price_amount} {offer.currency}
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Selected Plan
                        </dt>

                        <dd className="mt-1 text-sm text-white/80">
                            {formatPlanLabel(offer.plan_type)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Offer status
                        </dt>

                        <dd className="mt-1 text-sm text-white/80">
                            {formatStatusLabel(offer.status)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Created
                        </dt>

                        <dd className="mt-1 text-sm text-white/80">
                            {new Date(offer.created_at).toLocaleString()}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-emerald-100/80">
                            {getOfferStageTitle({
                                isSent,
                                isAccepted,
                                paymentPending,
                                paymentPaid,
                            })}
                        </dt>

                        <dd className="mt-1 text-sm leading-6 text-white/80">
                            {getOfferStageText({
                                isSent,
                                isAccepted,
                                paymentPending,
                                paymentPaid,
                            })}
                        </dd>
                    </div>
                </div>

                <div className="mt-10 rounded-2xl border border-white/10 bg-black/10 p-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
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
                            <p className="text-sm text-white/75 leading-6">
                                Accepting this offer confirms that you want to proceed with this advisory engagement under the selected plan and price. It does not mean your case is already open yet. The case becomes available in the portal only after payment is confirmed.
                            </p>
                        ) : isAccepted ? (
                            paymentPaid ? (
                                <p className="text-sm text-white/75 leading-6">
                                    Your payment has been confirmed. Your case is now available in the client portal and you can continue from the cases section.
                                </p>
                            ) : (
                                <p className="text-sm text-white/75 leading-6">
                                    Your offer has already been accepted. Payment is currently awaiting confirmation. No additional action is required from you on this page right now.
                                </p>
                            )
                        ) : (
                            <p className="text-sm text-white/75 leading-6">
                                This offer is not currently actionable from the client area.
                            </p>
                        )}

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-[0.14em] text-white/45">
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
                                        className="text-sm leading-6 text-white/80"
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
                                    className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow-glass hover:bg-blue-600 transition"
                                >
                                    Accept and Continue
                                </button>
                            </form>
                        ) : null}

                        {isAccepted && paymentPending ? (
                            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
                                Payment confirmation pending
                            </div>
                        ) : null}

                        {isAccepted && paymentPaid ? (
                            <>
                                <div className="rounded-xl border border-green-400/30 bg-green-500/10 px-6 py-3 text-sm text-green-300">
                                    Payment confirmed
                                </div>

                                <Link
                                    href="/dashboard/cases"
                                    className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/5 transition"
                                >
                                    Open My Cases
                                </Link>
                            </>
                        ) : null}

                        <Link
                            href="/dashboard"
                            className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/5 transition"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </article>
        </section>
    );
}