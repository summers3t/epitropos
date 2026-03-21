import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendOffer } from "./sendOffer";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatPlanLabel(planType: string | null | undefined) {
    if (!planType) return "—";

    if (planType === "core") return "Core Analysis";
    if (planType === "strategic") return "Strategic Analysis";

    return planType;
}

export default async function AdminOfferDetailPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/offers/${id}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(
            "id, screening_request_id, plan_type, price_amount, currency, status, expires_at, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (offerError) {
        throw new Error(offerError.message);
    }

    if (!offer) {
        notFound();
    }

    const { data: screening, error: screeningError } = await supabase
        .from("screening_requests")
        .select("id, name, email, status")
        .eq("id", offer.screening_request_id)
        .maybeSingle();

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href={screening ? `/admin/screening/${screening.id}` : "/admin/screening"}
                    className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 hover:text-white transition"
                >
                    ← Back to screening request
                </Link>

                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Admin Console
                </p>

                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Offer Detail
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Internal commercial offer view. This page reflects the current offer lifecycle state.
                </p>
            </div>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div>
                            <p className="text-lg font-semibold text-white">
                                {screening?.name || "Unknown applicant"}
                            </p>
                            <p className="text-sm text-white/70">{screening?.email || "—"}</p>
                        </div>

                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Offer status
                            </div>
                            <div className="mt-1 text-xs font-semibold tracking-[0.04em] text-white/75">
                                {formatStatusLabel(offer.status)}
                            </div>
                            <div className="mt-1 text-xs text-white/55">
                                {offer.status === "draft"
                                    ? "Draft only. Not yet visible to the client."
                                    : offer.status === "sent"
                                        ? "Sent to the client and awaiting response."
                                        : offer.status === "accepted"
                                            ? "Accepted by the client. Payment/order flow is active."
                                            : "This offer is no longer active."}
                            </div>
                        </div>

                        {offer.status === "draft" ? (
                            <form action={sendOffer.bind(null, offer.id)} className="pt-3">
                                <button
                                    type="submit"
                                    className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                >
                                    Send Offer
                                </button>
                            </form>
                        ) : null}
                    </div>

                    <div className="text-sm text-white/70 md:text-right">
                        <div>
                            <span className="text-white/45">Created:</span>{" "}
                            {new Date(offer.created_at).toLocaleString()}
                        </div>
                        <div className="mt-1">
                            <span className="text-white/45">Updated:</span>{" "}
                            {new Date(offer.updated_at).toLocaleString()}
                        </div>
                        <div className="mt-1 break-all">
                            <span className="text-white/45">Offer ID:</span> {offer.id}
                        </div>
                    </div>
                </div>

                <dl className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Plan type
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {formatPlanLabel(offer.plan_type)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Price
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {offer.price_amount} {offer.currency}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Screening request
                        </dt>
                        <dd className="mt-1 break-all text-sm text-white/80">
                            {offer.screening_request_id}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Screening status
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {formatStatusLabel(screening?.status)}
                        </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 md:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                            Expires at
                        </dt>
                        <dd className="mt-1 text-sm text-white/80">
                            {offer.expires_at ? new Date(offer.expires_at).toLocaleString() : "—"}
                        </dd>
                    </div>
                </dl>
            </article>
        </section>
    );
}