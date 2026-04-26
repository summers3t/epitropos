import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteScreeningAdmin } from "../cases/[id]/adminCleanupActions";

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTriageLabel(value: string | null | undefined) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRecommendedPlan(value: string | null | undefined) {
  if (!value) return "—";
  if (value === "foundation") return "Foundation";
  if (value === "evaluation") return "Evaluation";
  if (value === "guidance") return "Guidance";
  return value;
}

function getSituationSnippet(screeningAnswers: unknown) {
  if (
    screeningAnswers &&
    typeof screeningAnswers === "object" &&
    "situation" in screeningAnswers
  ) {
    const value = screeningAnswers.situation;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "—";
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
      "id, user_id, created_at, status, name, email, notes, triage_result, recommended_plan, primary_blocker, readiness_answers, screening_answers",
    )
    .order("created_at", { ascending: false });

  const userIds = Array.from(
    new Set(
      (screeningRequests ?? [])
        .map((request) => request.user_id)
        .filter(Boolean),
    ),
  );

  const { data: userProfiles, error: userProfilesError } =
    userIds.length > 0
      ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
      : { data: [], error: null as null | Error };

  if (userProfilesError) {
    throw new Error(userProfilesError.message);
  }

  const profileNameByUserId = new Map(
    (userProfiles ?? []).map((item) => [item.id, item.full_name]),
  );

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
          Screening Inbox
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-white/72">
          New intake queue for Readiness Check → Serious Screening submissions.
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
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {isLatest ? (
                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
                          Latest
                        </span>
                      ) : null}

                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                        {formatStatusLabel(request.status)}
                      </span>

                      <span className="rounded-full border border-stone/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-stone/85">
                        {formatTriageLabel(request.triage_result)}
                      </span>

                      {request.recommended_plan ? (
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                          {formatRecommendedPlan(request.recommended_plan)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-white">
                        {profileNameByUserId.get(request.user_id) || "Unnamed user"}
                      </p>
                      <p className="text-sm text-white/70">{request.email || "—"}</p>
                      <p className="mt-1 text-sm text-white/80">{request.name || "—"}</p>
                    </div>
                  </div>

                  <div className="text-sm text-white/70 md:text-right">
                    <div>
                      <span className="text-white/45">Submitted:</span>{" "}
                      {new Date(request.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1 break-all">
                      <span className="text-white/45">Request ID:</span>{" "}
                      {request.id}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                      Situation
                    </div>
                    <div className="mt-2 text-sm text-white/80">
                      {getSituationSnippet(request.screening_answers)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                      Primary blocker
                    </div>
                    <div className="mt-2 text-sm text-white/80">
                      {request.primary_blocker || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                      Client note
                    </div>
                    <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-white/80">
                      {request.notes || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <form action={deleteScreeningAdmin.bind(null, request.id)}>
                    <button className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 transition hover:bg-red-500/10">
                      Delete
                    </button>
                  </form>

                  <a
                    href={`/admin/screening/${request.id}`}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs transition hover:bg-white/5"
                  >
                    Review
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