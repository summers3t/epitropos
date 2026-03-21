import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at"
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
            "id, amount, currency, payment_status, payment_provider, payment_reference, created_at, updated_at"
        )
        .eq("offer_id", offer.id)
        .maybeSingle();

    if (orderError) {
        throw new Error(orderError.message);
    }

    if (!order) {
        throw new Error(
            "Payment placeholder order is missing. Apply Step 29 migration and verify accepted-offer backfill."
        );
    }

    const isPaid = order.payment_status === "paid";

    return (
        <section className="space-y-8 max-w-4xl">
            <div className="space-y-3">
                <Link
                    href={`/dashboard/offers/${offer.id}`}
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to offer
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Payment Status
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-white/72">
                    This page shows the current payment status for your accepted offer.
                    Payment confirmation is handled manually at this stage.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Offer status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            Accepted
                        </dd>
                    </div>

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
                            Amount due
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {order.amount} {order.currency}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Payment status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {formatPaymentStatusLabel(order.payment_status)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Payment method
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            Manual confirmation
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Payment reference
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {order.payment_reference || "—"}
                        </dd>
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-6 space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
                        {isPaid ? "Payment confirmed" : "Payment pending"}
                    </p>

                    {isPaid ? (
                        <p className="text-sm leading-6 text-white/75">
                            Your payment has been marked as confirmed. Your case has now
                            been created and will appear in your client portal.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm leading-6 text-white/75">
                                Online payment is not connected yet.
                            </p>

                            <p className="text-sm leading-6 text-white/75">
                                Payment is confirmed manually. Your case will appear
                                automatically after payment is marked as paid.
                            </p>
                        </>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href={`/dashboard/offers/${offer.id}`}
                        className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/5 transition"
                    >
                        Back to Offer
                    </Link>

                    {isPaid ? (
                        <Link
                            href="/dashboard/cases"
                            className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/5 transition"
                        >
                            Open My Cases
                        </Link>
                    ) : null}

                    <Link
                        href="/dashboard"
                        className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/70 hover:bg-white/5 transition"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </article>
        </section>
    );
}