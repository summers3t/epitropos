import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewScreeningRequest } from "./updateStatus";
import { deleteScreeningAdmin } from "../../cases/[id]/adminCleanupActions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    status_error?: string;
    status_success?: string;
  }>;
};

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

function renderValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "—";
}

const readinessOrder = [
  ["whyGreece", "Why Greece"],
  ["stage", "Current stage"],
  ["propertyUse", "Property use"],
  ["budgetBand", "Budget band"],
  ["financing", "Financing"],
  ["identifiedProperty", "Property identified"],
  ["seriousness", "Urgency"],
  ["mainWorry", "Main worry"],
] as const;

const screeningOrder = [
  ["mainFocus", "Main focus now"],
  ["situation", "Situation"],
  ["locationText", "Location"],
  ["locationClarity", "Location clarity"],
  ["propertyDifficulty", "Property difficulty"],
  ["financingClarity", "Financing clarity"],
  ["creditProgress", "Credit progress"],
  ["equitySource", "Equity / collateral source"],
  ["hasCreditAdvisor", "Credit advisor / bank contact"],
  ["cashCertainty", "Cash certainty"],
  ["propertyType", "Property type"],
  ["renovationTolerance", "Renovation tolerance"],
  ["incomeImportance", "Income importance"],
  ["creditCoverageImportance", "Credit coverage importance"],
  ["successOutcome", "Success outcome"],
  ["missingPiece", "Missing piece"],
  ["helpType", "Preferred help type"],
  ["listingUrl", "Listing URL"],
  ["additionalContext", "Additional context"],
] as const;

export default async function AdminScreeningDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

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
      "id, user_id, created_at, updated_at, status, name, email, notes, triage_result, recommended_plan, primary_blocker, readiness_answers, screening_answers",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!request) {
    notFound();
  }

  const { data: requestUserProfile, error: requestUserProfileError } =
    await supabase
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

  const readinessAnswers =
    request.readiness_answers &&
      typeof request.readiness_answers === "object" &&
      !Array.isArray(request.readiness_answers)
      ? (request.readiness_answers as Record<string, unknown>)
      : {};

  const screeningAnswers =
    request.screening_answers &&
      typeof request.screening_answers === "object" &&
      !Array.isArray(request.screening_answers)
      ? (request.screening_answers as Record<string, unknown>)
      : {};

  const statusError =
    typeof resolvedSearchParams.status_error === "string"
      ? resolvedSearchParams.status_error
      : null;

  const statusSuccess =
    typeof resolvedSearchParams.status_success === "string"
      ? resolvedSearchParams.status_success
      : null;

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <Link
          href="/admin/screening"
          className="inline-flex text-xs uppercase tracking-[0.16em] text-white/55 transition hover:text-white"
        >
          ← Back to screening inbox
        </Link>

        <p className="text-xs uppercase tracking-[0.18em] text-white/55">
          Admin Console
        </p>

        <h1
          className="text-4xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Screening Review
        </h1>

        <p className="max-w-3xl text-sm leading-6 text-white/72">
          Internal review page for the new intake flow.
        </p>
      </div>

      {statusSuccess ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100/90">
          {statusSuccess}
        </div>
      ) : null}

      {statusError ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100/90">
          {statusError}
        </div>
      ) : null}

      <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
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
                {requestUserProfile?.full_name || "Unnamed user"}
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
            <div className="mt-1">
              <span className="text-white/45">Updated:</span>{" "}
              {request.updated_at
                ? new Date(request.updated_at).toLocaleString()
                : "—"}
            </div>
            <div className="mt-1 break-all">
              <span className="text-white/45">Request ID:</span> {request.id}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr_340px]">
          <section className="space-y-4">
            <h2 className="text-sm uppercase tracking-[0.16em] text-white/45">
              Readiness Check
            </h2>

            <div className="space-y-3">
              {readinessOrder.map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                    {label}
                  </div>
                  <div className="mt-1 text-sm text-white/82">
                    {renderValue(readinessAnswers[key])}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm uppercase tracking-[0.16em] text-white/45">
              Serious Screening
            </h2>

            <div className="space-y-3">
              {screeningOrder.map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                    {label}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-white/82">
                    {renderValue(screeningAnswers[key])}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                Client note
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-white/82">
                {request.notes || "—"}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <h2 className="text-sm uppercase tracking-[0.16em] text-white/45">
              Internal review
            </h2>

            <form
              action={reviewScreeningRequest.bind(null, request.id)}
              className="space-y-4 rounded-3xl border border-white/10 bg-black/10 p-5"
            >
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.14em] text-white/45">
                  Triage result
                </span>
                <select
                  name="triage_result"
                  defaultValue={request.triage_result ?? ""}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select</option>
                  <option value="reject">Reject</option>
                  <option value="not_ready">Not ready</option>
                  <option value="foundation_fit">Foundation fit</option>
                  <option value="evaluation_fit">Evaluation fit</option>
                  <option value="guidance_fit">Guidance fit</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.14em] text-white/45">
                  Recommended plan
                </span>
                <select
                  name="recommended_plan"
                  defaultValue={request.recommended_plan ?? ""}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select</option>
                  <option value="foundation">Foundation</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="guidance">Guidance</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.14em] text-white/45">
                  Primary blocker
                </span>
                <textarea
                  name="primary_blocker"
                  defaultValue={request.primary_blocker ?? ""}
                  rows={4}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder="Short internal blocker summary"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white transition hover:bg-white/5"
              >
                Save review
              </button>
            </form>

            <div className="rounded-3xl border border-white/10 bg-black/10 p-5 text-sm text-white/70">
              <div className="text-xs uppercase tracking-[0.14em] text-white/42">
                Commercial chain
              </div>

              <div className="mt-3 space-y-2">
                <div>Draft offer: {draftOffer ? "Yes" : "No"}</div>
                <div>Sent offer: {sentOffer ? "Yes" : "No"}</div>
                <div>Accepted offer: {acceptedOffer ? "Yes" : "No"}</div>
                <div>Order: {order ? order.payment_status : "—"}</div>
                <div>Case: {linkedCase ? linkedCase.status : "—"}</div>
              </div>

              {request.status === "accepted" &&
                !draftOffer &&
                !sentOffer &&
                !acceptedOffer ? (
                <div className="mt-4">
                  <Link
                    href={`/admin/offers/new?screening=${request.id}`}
                    className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs transition hover:bg-white/5"
                  >
                    Prepare Offer
                  </Link>
                </div>
              ) : null}

              {draftOffer ? (
                <div className="mt-3 text-xs">
                  <Link
                    href={`/admin/offers/${draftOffer.id}`}
                    className="underline hover:text-white"
                  >
                    Open draft offer
                  </Link>
                </div>
              ) : null}

              {sentOffer ? (
                <div className="mt-2 text-xs">
                  <Link
                    href={`/admin/offers/${sentOffer.id}`}
                    className="underline hover:text-white"
                  >
                    Open sent offer
                  </Link>
                </div>
              ) : null}

              {acceptedOffer ? (
                <div className="mt-2 text-xs">
                  <Link
                    href={`/admin/offers/${acceptedOffer.id}`}
                    className="underline hover:text-white"
                  >
                    Open accepted offer
                  </Link>
                </div>
              ) : null}

              {order ? (
                <div className="mt-2 text-xs">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="underline hover:text-white"
                  >
                    Open order
                  </Link>
                </div>
              ) : null}

              {linkedCase ? (
                <div className="mt-2 text-xs">
                  <Link
                    href={`/admin/cases/${linkedCase.id}`}
                    className="underline hover:text-white"
                  >
                    Open case
                  </Link>
                </div>
              ) : null}
            </div>

            <form action={deleteScreeningAdmin.bind(null, request.id)}>
              <button className="rounded-xl border border-red-400/30 px-4 py-2 text-xs text-red-200 transition hover:bg-red-500/10">
                Delete Screening
              </button>
            </form>
          </aside>
        </div>
      </article>
    </section>
  );
}