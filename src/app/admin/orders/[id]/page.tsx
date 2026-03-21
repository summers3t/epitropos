import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markOrderPaid } from "./markPaid";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

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

function formatPlanLabel(planType: string | null | undefined) {
    if (!planType) return "—";
    if (planType === "core") return "Core Analysis";
    if (planType === "strategic") return "Strategic Analysis";
    return planType;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/orders/${id}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
            "id, user_id, offer_id, amount, currency, payment_status, payment_provider, payment_reference, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (orderError) {
        throw new Error(orderError.message);
    }

    if (!order) {
        notFound();
    }

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, created_at"
        )
        .eq("id", order.offer_id)
        .maybeSingle();

    if (offerError) {
        throw new Error(offerError.message);
    }

    const { data: screening, error: screeningError } = offer
        ? await supabase
            .from("screening_requests")
            .select("id, name, email, status")
            .eq("id", offer.screening_request_id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", order.user_id)
        .maybeSingle();

    if (clientProfileError) {
        throw new Error(clientProfileError.message);
    }

    const { data: linkedCase, error: linkedCaseError } = await supabase
        .from("cases")
        .select("id, status")
        .eq("order_id", order.id)
        .maybeSingle();

    if (linkedCaseError) {
        throw new Error(linkedCaseError.message);
    }

    const isPending = order.payment_status === "pending";
    const isPaid = order.payment_status === "paid";

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/admin/orders"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to orders
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Admin Console
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Order Detail
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Manual payment confirmation placeholder. This is not a real gateway
                    integration.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                            {formatPaymentStatusLabel(order.payment_status)}
                        </span>

                        <div>
                            <p className="text-xl font-semibold text-white">
                                {screening?.name ||
                                    clientProfile?.full_name ||
                                    "Unnamed client"}
                            </p>
                            <p className="text-sm text-white/70">
                                {screening?.email || clientProfile?.email || "—"}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Amount
                        </div>
                        <div className="mt-2 text-3xl font-bold text-white">
                            {order.amount} {order.currency}
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Plan
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {formatPlanLabel(offer?.plan_type)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Offer status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {offer?.status || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Screening status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {screening?.status || "—"}
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

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Linked case
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {linkedCase ? linkedCase.id : "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Case status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {linkedCase?.status || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 md:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Order ID
                        </dt>
                        <dd className="mt-1 break-all text-sm text-white/80">
                            {order.id}
                        </dd>
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-6">
                    {isPending ? (
                        <form action={markOrderPaid.bind(null, order.id)} className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="payment_reference"
                                    className="block text-xs uppercase tracking-[0.14em] text-white/45"
                                >
                                    Payment reference
                                </label>
                                <input
                                    id="payment_reference"
                                    name="payment_reference"
                                    type="text"
                                    placeholder="Optional bank reference / manual note"
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow-glass hover:bg-blue-600 transition"
                            >
                                Mark as Paid
                            </button>
                        </form>
                    ) : isPaid ? (
                        <div className="space-y-3">
                            <p className="text-sm text-white/75 leading-6">
                                Payment has been confirmed for this order.
                                {linkedCase
                                    ? " The engagement case has already been created."
                                    : " The engagement case should now exist for this order."}
                            </p>

                            {linkedCase ? (
                                <Link
                                    href={`/admin/cases/${linkedCase.id}`}
                                    className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                >
                                    Open Case
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-white/75 leading-6">
                            This order is no longer in a pending state. No further action is
                            available in this step.
                        </p>
                    )}
                </div>
            </article>
        </section>
    );
}