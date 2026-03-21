import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
    getDefaultOfferPrice,
    isOfferPlanType,
    type OfferPlanType,
} from "@/lib/config/pricing";
import { createDraftOffer } from "./createDraftOffer";
import OfferDraftForm from "./OfferDraftForm";

type PageProps = {
    searchParams: Promise<{
        screening?: string;
    }>;
};

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export default async function NewOfferPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const screeningId = params.screening;

    if (!screeningId) {
        redirect("/admin/screening");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/auth/login?redirect=/admin/offers/new?screening=${screeningId}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: screening, error: screeningError } = await supabase
        .from("screening_requests")
        .select("id, status, name, email, plan_interest")
        .eq("id", screeningId)
        .maybeSingle();

    if (screeningError) {
        throw new Error(screeningError.message);
    }

    if (!screening) {
        notFound();
    }

    if (screening.status !== "accepted") {
        redirect(`/admin/screening/${screening.id}`);
    }

    const { data: sentOffer, error: sentOfferError } = await supabase
        .from("offers")
        .select("id")
        .eq("screening_request_id", screening.id)
        .eq("status", "sent")
        .maybeSingle();

    if (sentOfferError) {
        throw new Error(sentOfferError.message);
    }

    if (sentOffer) {
        redirect(`/admin/screening/${screening.id}`);
    }

    const initialPlanType: OfferPlanType | "" = isOfferPlanType(
        screening.plan_interest ?? ""
    )
        ? screening.plan_interest
        : "";

    const initialPriceAmount = initialPlanType
        ? String(getDefaultOfferPrice(initialPlanType))
        : "";

    return (
        <section className="space-y-8">
            <div className="space-y-3">
                <Link
                    href={`/admin/screening/${screening.id}`}
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
                    Prepare Offer
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Create a draft commercial offer from an accepted screening request.
                    Saving a draft does not mark the offer as sent.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                        Screening context
                    </p>

                    <div className="mt-4 space-y-3 text-sm text-white/80">
                        <div>
                            <span className="text-white/45">Name:</span> {screening.name || "—"}
                        </div>
                        <div>
                            <span className="text-white/45">Email:</span> {screening.email || "—"}
                        </div>
                        <div>
                            <span className="text-white/45">Screening status:</span>{" "}
                            {formatStatusLabel(screening.status)}
                        </div>
                        <div>
                            <span className="text-white/45">Plan interest:</span>{" "}
                            {screening.plan_interest || "—"}
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                        Offer draft
                    </p>

                    <div className="mt-4">
                        <OfferDraftForm
                            initialPlanType={initialPlanType}
                            initialPriceAmount={initialPriceAmount}
                            action={createDraftOffer.bind(null, screening.id)}
                        />
                    </div>
                </section>
            </div>
        </section>
    );
}