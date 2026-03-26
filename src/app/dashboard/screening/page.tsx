import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteOwnScreeningRequest } from "./deleteScreeningRequest";


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

export default async function DashboardScreeningPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: screeningRequests, error } = await supabase
        .from("screening_requests")
        .select("id, name, status, created_at, budget_range, financing_type, goal, plan_interest")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <section className="space-y-8">
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

                <div className="flex items-center gap-3">
                    <h1
                        className="text-4xl font-black tracking-tight"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                        Screening
                    </h1>

                    {screeningRequests && screeningRequests.length > 0 ? (
                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-white/10 px-2 py-1 text-xs font-semibold leading-none text-white/85">
                            {screeningRequests.length}
                        </span>
                    ) : null}
                </div>

                <p className="max-w-2xl text-sm leading-6 text-white/72">
                    Check the status of your screening requests and the next available step.
                </p>
            </div>

            {error ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <p className="text-sm text-white/75">
                        Screening requests could not be loaded right now.
                    </p>
                </div>
            ) : screeningRequests && screeningRequests.length > 0 ? (
                <div className="space-y-4">
                    {screeningRequests.map((request, index) => {
                        const showLatestBadge = index === 0;

                        return (
                            <article
                                key={request.id}
                                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                                                Screening / case label
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-white">
                                                {request.name || "—"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                                                Submitted
                                            </p>
                                            <p className="mt-1 text-sm text-white/80">
                                                {new Date(request.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {showLatestBadge ? (
                                            <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                                Latest
                                            </span>
                                        ) : null}

                                        <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
                                            {formatStatusLabel(request.status)}
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm leading-6 text-white/72">
                                    {getStatusHelp(request.status)}
                                </p>

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
                                </dl>

                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <Link
                                        href={`/dashboard/screening/${request.id}`}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                    >
                                        View
                                    </Link>

                                    {["new"].includes(request.status ?? "") ? (
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
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <p className="text-lg font-semibold">No screening requests found.</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
                        Screening is the required first step. Submit your details to begin the review process.
                    </p>
                    <Link
                        href="/screening"
                        className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                    >
                        Apply for Screening
                    </Link>
                </div>
            )}
        </section>
    );
}