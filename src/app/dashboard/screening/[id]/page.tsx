import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteOwnScreeningRequest } from "../deleteScreeningRequest";

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

function getStatusHelp(status: string | null | undefined) {
    switch (status) {
        case "new":
            return "Your screening request has been submitted and is waiting for review.";
        case "accepted":
            return "Your screening has been accepted. The next step is the commercial offer.";
        case "offer_sent":
            return "Your screening has passed review and an offer has already been issued.";
        case "rejected":
            return "Your screening was reviewed but was not accepted for further engagement.";
        default:
            return "Your screening request is being processed.";
    }
}

function getScreeningProgressSteps({
    screeningStatus,
    paymentPending,
    paymentPaid,
    caseStatus,
}: {
    screeningStatus: string | null | undefined;
    paymentPending: boolean;
    paymentPaid: boolean;
    caseStatus: string | null | undefined;
}) {
    const base = [
        { key: "submitted", label: "Submitted", state: "upcoming" as "done" | "current" | "upcoming" },
        { key: "review", label: "Under review", state: "upcoming" as "done" | "current" | "upcoming" },
        { key: "offer", label: "Offer issued", state: "upcoming" as "done" | "current" | "upcoming" },
        { key: "payment", label: "Payment confirmed", state: "upcoming" as "done" | "current" | "upcoming" },
        { key: "analysis", label: "In analysis", state: "upcoming" as "done" | "current" | "upcoming" },
        { key: "outcome", label: "Outcome delivered", state: "upcoming" as "done" | "current" | "upcoming" },
    ];

    if (screeningStatus === "rejected") {
        base[0].state = "done";
        base[1].state = "current";
        return base;
    }

    base[0].state = "done";

    if (screeningStatus === "new") {
        base[1].state = "current";
        return base;
    }

    base[1].state = "done";

    if (screeningStatus === "accepted") {
        base[2].state = "current";
        return base;
    }

    if (screeningStatus === "offer_sent") {
        base[2].state = "done";

        if (paymentPending) {
            base[3].state = "current";
            return base;
        }

        if (paymentPaid) {
            base[3].state = "done";

            if (caseStatus === "active" || caseStatus === "analysis") {
                base[4].state = "current";
                return base;
            }

            if (caseStatus === "delivered" || caseStatus === "closed") {
                base[4].state = "done";
                base[5].state = "current";
                return base;
            }

            base[4].state = "current";
            return base;
        }

        base[3].state = "upcoming";
        return base;
    }

    base[1].state = "current";
    return base;
}

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function DashboardScreeningDetailPage({
    params,
}: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/dashboard/screening/${id}`);
    }

    const { data: request, error } = await supabase
        .from("screening_requests")
        .select(
            "id, user_id, status, created_at, budget_range, financing_type, goal, property_identified, listing_url, plan_interest, notes"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!request) {
        notFound();
    }

    const canDelete = ["new"].includes(request.status ?? "");

    const { data: relatedOffer, error: relatedOfferError } = await supabase
        .from("offers")
        .select("id, status")
        .eq("screening_request_id", request.id)
        .in("status", ["sent", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (relatedOfferError) {
        throw new Error(relatedOfferError.message);
    }

    const { data: relatedOrder, error: relatedOrderError } = relatedOffer
        ? await supabase
            .from("orders")
            .select("id, payment_status")
            .eq("offer_id", relatedOffer.id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (relatedOrderError) {
        throw new Error(relatedOrderError.message);
    }

    const { data: relatedCase, error: relatedCaseError } = relatedOrder
        ? await supabase
            .from("cases")
            .select("id, status")
            .eq("order_id", relatedOrder.id)
            .eq("client_id", user.id)
            .maybeSingle()
        : { data: null, error: null as null | Error };

    if (relatedCaseError) {
        throw new Error(relatedCaseError.message);
    }

    const paymentPending = relatedOrder?.payment_status === "pending";
    const paymentPaid = relatedOrder?.payment_status === "paid";

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/dashboard/screening"
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to my screenings
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Client Portal
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Screening Request
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-white/72">
                    Review your submitted screening details and the current status of this request.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Submitted
                        </p>
                        <p className="mt-1 text-sm text-white/80">
                            {new Date(request.created_at).toLocaleString()}
                        </p>
                    </div>

                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
                        {formatStatusLabel(request.status)}
                    </div>
                </div>

                <div className="mt-6 grid gap-2 md:grid-cols-6">
                    {getScreeningProgressSteps({
                        screeningStatus: request.status,
                        paymentPending,
                        paymentPaid,
                        caseStatus: relatedCase?.status,
                    }).map((step) => (
                        <div
                            key={step.key}
                            className={[
                                "rounded-xl border px-3 py-3",
                                step.state === "done"
                                    ? "border-emerald-400/35 bg-emerald-500/12"
                                    : step.state === "current"
                                        ? "border-sky-300/45 bg-sky-400/12 ring-1 ring-sky-300/30"
                                        : "border-white/10 bg-black/10",
                            ].join(" ")}
                        >
                            <div
                                className={[
                                    "text-[10px] uppercase tracking-[0.14em]",
                                    step.state === "done"
                                        ? "text-emerald-100/90"
                                        : step.state === "current"
                                            ? "text-sky-100"
                                            : "text-white/40",
                                ].join(" ")}
                            >
                                {step.state === "done"
                                    ? "Completed"
                                    : step.state === "current"
                                        ? "Current"
                                        : "Upcoming"}
                            </div>
                            <div
                                className={[
                                    "mt-1 text-xs font-medium leading-5",
                                    step.state === "current"
                                        ? "text-white"
                                        : "text-white/78",
                                ].join(" ")}
                            >
                                {step.label}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-4 text-sm leading-6 text-white/72">
                    {getStatusHelp(request.status)}
                </p>

                <dl className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {formatStatusLabel(request.status)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Submitted
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {new Date(request.created_at).toLocaleString()}
                        </dd>
                    </div>

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
                            Review focus
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {request.goal || "—"}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Selected Plan
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
                            Listing link
                        </dt>
                        <dd className="mt-1 break-all text-sm text-white/80">
                            {request.listing_url || "—"}
                        </dd>
                    </div>
                </dl>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Additional notes
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                        {request.notes || "—"}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Link
                        href="/dashboard/screening"
                        className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                    >
                        Back to Screening
                    </Link>

                    {canDelete ? (
                        <form action={deleteOwnScreeningRequest.bind(null, request.id)}>
                            <ConfirmSubmitButton
                                confirmMessage="Delete this screening request? This cannot be undone."
                                className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10 transition"
                            >
                                Delete Request
                            </ConfirmSubmitButton>
                        </form>
                    ) : null}
                </div>
            </article>
        </section>
    );
}