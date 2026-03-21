import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteScreeningAdmin } from "../cases/[id]/adminCleanupActions";

function formatStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export default async function AdminScreeningPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/admin/screening");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: screeningRequests, error } = await supabase
        .from("screening_requests")
        .select(
            "id, user_id, created_at, status, name, email, budget_range, financing_type, goal, property_identified, listing_url, plan_interest, notes"
        )
        .order("created_at", { ascending: false });

    return (
        <section className="space-y-8">
            <header className="max-w-4xl space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Admin Console
                </p>
                <h1
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    Screening Requests
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Internal screening intake view. This console is operational only and
                    is not visible to clients.
                </p>
            </header>

            {error ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/75 backdrop-blur">
                    Screening requests could not be loaded right now.
                </div>
            ) : screeningRequests && screeningRequests.length > 0 ? (
                <div className="space-y-4">
                    {screeningRequests.map((request, index) => {
                        const isLatest = index === 0;

                        return (
                            <article
                                key={request.id}
                                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            {isLatest ? (
                                                <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
                                                    Latest
                                                </span>
                                            ) : null}

                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                                                    Status
                                                </div>
                                                <div className="mt-1 text-xs font-semibold tracking-[0.04em] text-white/75">
                                                    {formatStatusLabel(request.status)}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-lg font-semibold text-white">
                                                {request.name || "Unnamed applicant"}
                                            </p>
                                            <p className="text-sm text-white/70">{request.email || "—"}</p>
                                        </div>
                                    </div>

                                    <div className="text-sm text-white/70 md:text-right">
                                        <div>
                                            <span className="text-white/45">Submitted:</span>{" "}
                                            {new Date(request.created_at).toLocaleString()}
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
                                        <dd className="mt-1 text-sm text-white/80">
                                            {request.goal || "—"}
                                        </dd>
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

                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <form action={deleteScreeningAdmin.bind(null, request.id)}>
                                        <ConfirmSubmitButton
                                            confirmMessage="Delete this screening request and its linked chain? This may remove offers, orders, cases, reports, and property evaluations."
                                            className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10 transition"
                                        >
                                            Delete
                                        </ConfirmSubmitButton>
                                    </form>

                                    <a
                                        href={`/admin/screening/${request.id}`}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                    >
                                        View
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/75 backdrop-blur">
                    No screening requests found.
                </div>
            )}
        </section>
    );
}