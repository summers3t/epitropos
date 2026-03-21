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