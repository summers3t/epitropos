import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScreeningForm from "./ScreeningForm";

const PLAN_INTEREST_VALUES = [
  "core",
  "strategic",
  "portfolio_review",
  "not_sure",
] as const;
const GOAL_VALUES = ["investment", "personal", "hybrid"] as const;
const RISK_TOLERANCE_VALUES = [
  "conservative",
  "moderate",
  "aggressive",
] as const;
const CURRENCY_VALUES = ["EUR", "USD", "GBP"] as const;
const TIMELINE_VALUES = [
  "within_30_days",
  "within_3_months",
  "within_6_months",
  "within_12_months",
  "flexible",
] as const;
const FINANCING_VALUES = ["cash", "financing", "mixed"] as const;
const PROPERTY_IDENTIFIED_VALUES = ["yes", "no"] as const;
const MAX_BUDGET_VALUE = 10000000;

export type ScreeningSubmitState = {
  error: string | null;
};

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return allowed.includes(value as T[number]);
}

function parsePositiveNumber(raw: string) {
  const normalized = raw.replace(/[^\d]/g, "").trim();
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0 || value > MAX_BUDGET_VALUE) {
    return null;
  }

  return value;
}

function formatBudgetRange(
  currency: string | null,
  min: number | null,
  max: number | null,
) {
  if (!currency || min === null || max === null) return null;

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  });

  return `${currency} ${formatter.format(min)} - ${formatter.format(max)}`;
}

async function submitScreening(
  _prevState: ScreeningSubmitState,
  formData: FormData,
): Promise<ScreeningSubmitState> {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/auth/login?redirect=/screening");
  }

  if (!auth.user.email) {
    return { error: "Authenticated email is required." };
  }

  const case_label = String(formData.get("case_label") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const plan_interest = String(formData.get("plan_interest") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const risk_tolerance = String(formData.get("risk_tolerance") ?? "").trim();
  const preferred_markets = String(
    formData.get("preferred_markets") ?? "",
  ).trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "").trim();
  const budget_min_raw = String(formData.get("budget_min") ?? "").trim();
  const budget_max_raw = String(formData.get("budget_max") ?? "").trim();
  const decision_timeline = String(
    formData.get("decision_timeline") ?? "",
  ).trim();
  const financing_type = String(formData.get("financing_type") ?? "").trim();
  const property_identified = String(
    formData.get("property_identified") ?? "",
  ).trim();
  const listing_url = String(formData.get("listing_url") ?? "").trim() || null;

  if (case_label.length < 3) {
    return { error: "Screening / case name is required." };
  }

  if (!isOneOf(plan_interest, PLAN_INTEREST_VALUES)) {
    return { error: "Plan interest is invalid." };
  }

  if (!isOneOf(goal, GOAL_VALUES)) {
    return { error: "Investment objective is invalid." };
  }

  if (!isOneOf(risk_tolerance, RISK_TOLERANCE_VALUES)) {
    return { error: "Risk tolerance is invalid." };
  }

  if (preferred_markets.length < 2) {
    return { error: "Preferred markets are required." };
  }

  if (!isOneOf(currency, CURRENCY_VALUES)) {
    return { error: "Currency is invalid." };
  }

  const budget_min = parsePositiveNumber(budget_min_raw);
  const budget_max = parsePositiveNumber(budget_max_raw);

  if (budget_min === null || budget_max === null || budget_max < budget_min) {
    return { error: "Budget range is invalid or outside the supported range." };
  }

  if (!isOneOf(decision_timeline, TIMELINE_VALUES)) {
    return { error: "Decision timeline is invalid." };
  }

  if (!isOneOf(financing_type, FINANCING_VALUES)) {
    return { error: "Financing type is invalid." };
  }

  if (!isOneOf(property_identified, PROPERTY_IDENTIFIED_VALUES)) {
    return { error: "Property identified value is invalid." };
  }

  const hasPropertyIdentified = property_identified === "yes";

  if (hasPropertyIdentified) {
    if (!listing_url) {
      return {
        error: "Listing URL is required when a property is already identified.",
      };
    }

    try {
      const parsed = new URL(listing_url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { error: "Listing URL is invalid." };
      }
    } catch {
      return { error: "Listing URL is invalid." };
    }
  }

  const budget_range = formatBudgetRange(currency, budget_min, budget_max);

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("screening_requests")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("name", case_label)
    .maybeSingle();

  if (existingRequestError) {
    return { error: existingRequestError.message };
  }

  if (existingRequest) {
    return { error: "You already have a screening with this name." };
  }

  const { error } = await supabase.from("screening_requests").insert({
    user_id: auth.user.id,
    name: case_label,
    email: auth.user.email,
    phone,
    budget_range,
    budget_min,
    budget_max,
    currency,
    financing_type,
    goal,
    risk_tolerance,
    preferred_markets,
    decision_timeline,
    property_identified: hasPropertyIdentified,
    listing_url: hasPropertyIdentified ? listing_url : null,
    plan_interest,
    notes,
    status: "new",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard/screening?screening_created=1");
}

export default async function ScreeningPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const isLoggedIn = !!auth.user;

  let fullName = "";
  const email = auth.user?.email ?? "";

  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", auth.user.id)
      .maybeSingle();

    fullName =
      profile?.full_name ||
      (typeof auth.user.user_metadata?.full_name === "string"
        ? auth.user.user_metadata.full_name
        : null) ||
      (typeof auth.user.user_metadata?.name === "string"
        ? auth.user.user_metadata.name
        : null) ||
      "";
  }

  return (
    <section className="w-full">
      <ScreeningForm
        isLoggedIn={isLoggedIn}
        action={submitScreening}
        fullName={fullName}
        email={email}
      />
    </section>
  );
}
