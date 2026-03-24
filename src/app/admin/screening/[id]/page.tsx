import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { updateScreeningStatus } from "./updateStatus";
import { deleteScreeningAdmin } from "../../cases/[id]/adminCleanupActions";

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function AdminScreeningDetailPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/screening/${id}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: request, error } = await supabase
        .from("screening_requests")
        .select(
            "id, user_id, created_at, updated_at, status, name, email, budget_range, financing_type, goal, property_identified, listing_url, plan_interest, notes"
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!request) {
        notFound();
    }

    const { data: requestUserProfile, error: requestUserProfileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", request.user_id)
        .maybeSingle();

    if (requestUserProfileError) {
        throw new Error(requestUserProfileError.message);
    }

    const { data: offers, error: offersError } = await supabase
        .from("offers")
        .select("id, status")
        .eq("screening_request_id", request.id)
        .order("created_at", { ascending: false });

    if (offersError) {
        throw new Error(offersError.message);
    }

    const draftOffer = offers?.find((o) => o.status === "draft");
    const sentOffer = offers?.find((o) => o.status === "sent");
    const acceptedOffer = offers?.find((o) => o.status === "accepted");

    const commercialOffer = acceptedOffer ?? sentOffer ?? draftOffer ?? null;

    const { data: order, error: orderError } = commercialOffer
        ? await supabase
            .from("orders")
            .select("id, payment_status")
            .eq("offer_id", commercialOffer.id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (orderError) {
        throw new Error(orderError.message);
    }

    const { data: linkedCase, error: linkedCaseError } = order
        ? await supabase
            .from("cases")
            .select("id, status")
            .eq("order_id", order.id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (linkedCaseError) {
        throw new Error(linkedCaseError.message);
    }

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/admin/screening"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to screening list
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Admin Console
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Screening Request
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Internal request detail view. This page is for admin review only.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div>
                            <p className="text-lg font-semibold text-white">
                                {requestUserProfile?.full_name || "Unnamed user"}
                            </p>
                            <p className="text-sm text-white/70">{request.email || "—"}</p>
                            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Screening / case label
                            </p>
                            <p className="text-sm text-white/80">
                                {request.name || "—"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                    Status
                                </div>
                                <div className="mt-1 text-xs font-semibold tracking-[0.04em] text-white/75">
                                    {formatStatusLabel(request.status)}
                                </div>
                            </div>

                            <form
                                action={updateScreeningStatus.bind(null, request.id)}
                                className="flex items-center gap-2"
                            >
                                <select
                                    name="status"
                                    defaultValue=""
                                    className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs"
                                >
                                    <option value="" disabled>
                                        Select next status
                                    </option>

                                    {request.status === "new" ? (
                                        <>
                                            <option value="accepted">Accepted</option>
                                            <option value="rejected">Rejected</option>
                                        </>
                                    ) : null}

                                    {request.status === "rejected" ? (
                                        <option value="new">Reopen</option>
                                    ) : null}
                                </select>

                                <button
                                    type="submit"
                                    disabled={request.status === "accepted" || request.status === "offer_sent"}
                                    className="rounded-lg border border-white/15 px-3 py-1 text-xs hover:bg-white/5 transition disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Update
                                </button>
                            </form>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {request.status === "accepted" && !sentOffer && !draftOffer && !acceptedOffer ? (
                                    <Link
                                        href={`/admin/offers/new?screening=${request.id}`}
                                        className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                    >
                                        Prepare Offer
                                    </Link>
                                ) : null}

                                <form action={deleteScreeningAdmin.bind(null, request.id)}>
                                    <ConfirmSubmitButton
                                        confirmMessage="Delete this screening request and its linked test/commercial chain? This may remove offers, orders, cases, reports, and property evaluations."
                                        className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10 transition"
                                    >
                                        Delete Screening
                                    </ConfirmSubmitButton>
                                </form>
                            </div>

                            {draftOffer ? (
                                <div className="pt-2 text-xs text-white/65">
                                    Draft offer exists —{" "}
                                    <Link
                                        href={`/admin/offers/${draftOffer.id}`}
                                        className="underline hover:text-white"
                                    >
                                        open draft
                                    </Link>
                                </div>
                            ) : null}

                            {sentOffer ? (
                                <div className="pt-2 text-xs text-white/65">
                                    Offer already sent —{" "}
                                    <Link
                                        href={`/admin/offers/${sentOffer.id}`}
                                        className="underline hover:text-white"
                                    >
                                        view offer
                                    </Link>
                                </div>
                            ) : null}

                            {request.status === "accepted" && sentOffer ? (
                                <div className="pt-2 text-xs text-white/55">
                                    A sent offer already exists. Sending an offer should move this screening to Offer sent.
                                </div>
                            ) : null}

                            {acceptedOffer ? (
                                <div className="pt-2 text-xs text-white/65">
                                    Offer accepted —{" "}
                                    <Link
                                        href={`/admin/offers/${acceptedOffer.id}`}
                                        className="underline hover:text-white"
                                    >
                                        view accepted offer
                                    </Link>
                                </div>
                            ) : null}

                            {order ? (
                                <div className="pt-2 text-xs text-white/65">
                                    Order {order.payment_status === "paid" ? "paid" : "pending"} —{" "}
                                    <Link
                                        href={`/admin/orders/${order.id}`}
                                        className="underline hover:text-white"
                                    >
                                        open order
                                    </Link>
                                </div>
                            ) : null}

                            {linkedCase ? (
                                <div className="pt-2 text-xs text-white/65">
                                    Case created —{" "}
                                    <Link
                                        href={`/admin/cases/${linkedCase.id}`}
                                        className="underline hover:text-white"
                                    >
                                        open case
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="text-sm text-white/70 md:text-right">
                        <div>
                            <span className="text-white/45">Submitted:</span>{" "}
                            {new Date(request.created_at).toLocaleString()}
                        </div>
                        <div className="mt-1">
                            <span className="text-white/45">Updated:</span>{" "}
                            {request.updated_at
                                ? new Date(request.updated_at).toLocaleString()
                                : "—"}
                        </div>
                        <div className="mt-1 break-all">
                            <span className="text-white/45">User ID:</span> {request.user_id}
                        </div>
                        <div className="mt-1 break-all">
                            <span className="text-white/45">Request ID:</span> {request.id}
                        </div>
                    </div>
                </div>

                <dl className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Budget range
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {request.budget_range || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Financing type
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {request.financing_type || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Goal
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">{request.goal || "—"}</dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Plan interest
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {request.plan_interest || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Property identified
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {request.property_identified ? "Yes" : "No"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Listing URL
                        </dt>
                        <dd className="mt-1 break-all text-sm text-white/80">
                            {request.listing_url || "—"}
                        </dd>
                    </div>
                </dl>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Notes
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                        {request.notes || "—"}
                    </div>
                </div>
            </article>
        </section>
    );
}