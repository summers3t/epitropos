import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function AdminOrdersPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/admin/orders");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
            "id, user_id, offer_id, amount, currency, payment_status, payment_provider, payment_reference, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

    if (ordersError) {
        throw new Error(ordersError.message);
    }

    const offerIds = (orders ?? []).map((order) => order.offer_id);
    const userIds = (orders ?? []).map((order) => order.user_id);
    const orderIds = (orders ?? []).map((order) => order.id);

    const { data: offers, error: offersError } =
        offerIds.length > 0
            ? await supabase
                .from("offers")
                .select("id, screening_request_id, plan_type, status")
                .in("id", offerIds)
            : { data: [], error: null as null | Error };

    if (offersError) {
        throw new Error(offersError.message);
    }

    const screeningIds = (offers ?? []).map((offer) => offer.screening_request_id);

    const { data: screenings, error: screeningsError } =
        screeningIds.length > 0
            ? await supabase
                .from("screening_requests")
                .select("id, name, email")
                .in("id", screeningIds)
            : { data: [], error: null as null | Error };

    if (screeningsError) {
        throw new Error(screeningsError.message);
    }

    const { data: profiles, error: profilesError } =
        userIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, email, full_name")
                .in("id", userIds)
            : { data: [], error: null as null | Error };

    if (profilesError) {
        throw new Error(profilesError.message);
    }

    const { data: cases, error: casesError } =
        orderIds.length > 0
            ? await supabase
                .from("cases")
                .select("id, order_id, status")
                .in("order_id", orderIds)
            : { data: [], error: null as null | Error };

    if (casesError) {
        throw new Error(casesError.message);
    }

    const offersById = new Map((offers ?? []).map((offer) => [offer.id, offer]));
    const screeningsById = new Map(
        (screenings ?? []).map((screening) => [screening.id, screening])
    );
    const profilesById = new Map(
        (profiles ?? []).map((profileRow) => [profileRow.id, profileRow])
    );
    const casesByOrderId = new Map((cases ?? []).map((caseRow) => [caseRow.order_id, caseRow]));

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/admin/screening"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to admin
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Admin Console
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Orders
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Minimal commercial payment view. Orders are created after offer
                    acceptance and stay pending until manually confirmed as paid.
                </p>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="space-y-4">
                    {orders && orders.length > 0 ? (
                        orders.map((order) => {
                            const offer = offersById.get(order.offer_id);
                            const screening = offer
                                ? screeningsById.get(offer.screening_request_id)
                                : null;
                            const profileRow = profilesById.get(order.user_id);

                            return (
                                <article
                                    key={order.id}
                                    className="rounded-2xl border border-white/10 bg-black/10 p-5"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                                    {formatPaymentStatusLabel(order.payment_status)}
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {profileRow?.full_name || "Unnamed user"}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {profileRow?.email || screening?.email || "—"}
                                                </p>
                                                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                    Screening / case label
                                                </p>
                                                <p className="text-xs text-white/80">
                                                    {screening?.name || "—"}
                                                </p>
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-2 text-sm text-white/75">
                                                <div>
                                                    <span className="text-white/45">Plan: </span>
                                                    {formatPlanLabel(offer?.plan_type)}
                                                </div>
                                                <div>
                                                    <span className="text-white/45">Amount: </span>
                                                    {order.amount} {order.currency}
                                                </div>
                                                <div>
                                                    <span className="text-white/45">Offer status: </span>
                                                    {offer?.status || "—"}
                                                </div>
                                                <div>
                                                    <span className="text-white/45">Created: </span>
                                                    {new Date(order.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end">
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                View Order
                                            </Link>

                                            {casesByOrderId.get(order.id) ? (
                                                <Link
                                                    href={`/admin/cases/${casesByOrderId.get(order.id)!.id}`}
                                                    className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                                >
                                                    Open Case
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-white/70">
                            No orders yet.
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}