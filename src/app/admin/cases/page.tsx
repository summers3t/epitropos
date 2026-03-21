import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteCaseAdmin } from "./[id]/adminCleanupActions";

function formatCaseStatusLabel(status: string | null | undefined) {
    if (!status) return "—";

    const labels: Record<string, string> = {
        active: "Active",
        analysis: "Analysis",
        delivered: "Delivered",
        closed: "Closed",
    };

    return labels[status] ?? status;
}

export default async function AdminCasesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/admin/cases");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id, client_id, order_id, screening_request_id, title, status, created_at")
        .order("created_at", { ascending: false });

    if (casesError) {
        throw new Error(casesError.message);
    }

    const clientIds = (cases ?? []).map((item) => item.client_id);
    const screeningIds = (cases ?? [])
        .map((item) => item.screening_request_id)
        .filter(Boolean) as string[];

    const { data: profiles, error: profilesError } =
        clientIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, email, full_name")
                .in("id", clientIds)
            : { data: [], error: null as null | Error };

    if (profilesError) {
        throw new Error(profilesError.message);
    }

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

    const profilesById = new Map((profiles ?? []).map((row) => [row.id, row]));
    const screeningsById = new Map((screenings ?? []).map((row) => [row.id, row]));

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
                    Cases
                </h1>

                <p className="max-w-3xl text-sm leading-6 text-white/72">
                    Operational delivery view. A case exists only after a paid order.
                </p>
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="space-y-4">
                    {cases && cases.length > 0 ? (
                        cases.map((item) => {
                            const profileRow = profilesById.get(item.client_id);
                            const screening = item.screening_request_id
                                ? screeningsById.get(item.screening_request_id)
                                : null;

                            return (
                                <article
                                    key={item.id}
                                    className="rounded-2xl border border-white/10 bg-black/10 p-5"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-2">
                                            <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                                {formatCaseStatusLabel(item.status)}
                                            </span>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {item.title || "Untitled Case"}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {screening?.name ||
                                                        profileRow?.full_name ||
                                                        "Unnamed client"}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    {screening?.email || profileRow?.email || "—"}
                                                </p>
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-2 text-sm text-white/75">
                                                <div>
                                                    <span className="text-white/45">Case ID: </span>
                                                    {item.id}
                                                </div>
                                                <div>
                                                    <span className="text-white/45">Order ID: </span>
                                                    {item.order_id}
                                                </div>
                                                <div>
                                                    <span className="text-white/45">Created: </span>
                                                    {new Date(item.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 md:items-end">
                                            <form action={deleteCaseAdmin.bind(null, item.id)}>
                                                <ConfirmSubmitButton
                                                    confirmMessage="Delete this case? This will remove the case, all linked property evaluations, and all reports. If the case has a paid order or published report, use this only for controlled cleanup/testing."
                                                    className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-500/10 transition"
                                                >
                                                    Delete
                                                </ConfirmSubmitButton>
                                            </form>

                                            <Link
                                                href={`/admin/cases/${item.id}`}
                                                className="rounded-xl border border-white/15 px-4 py-2 text-xs hover:bg-white/5 transition"
                                            >
                                                Open Workspace
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-sm text-white/70">
                            No cases yet.
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}