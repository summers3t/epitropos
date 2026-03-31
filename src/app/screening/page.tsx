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
const MIN_BUDGET_VALUE = 10000;
const MAX_BUDGET_VALUE = 10000000;

export type ScreeningFieldName =
  | "case_label"
  | "phone"
  | "plan_interest"
  | "goal"
  | "risk_tolerance"
  | "preferred_markets"
  | "currency"
  | "budget_min"
  | "budget_max"
  | "decision_timeline"
  | "financing_type"
  | "property_identified"
  | "listing_url";

export type ScreeningSubmitState = {
  success: boolean;
  error: string | null;
  fieldErrors: Partial<Record<ScreeningFieldName, string>>;
};

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return allowed.includes(value as T[number]);
}

function parseBudgetNumber(raw: string) {
  const normalized = raw.replace(/[^\d]/g, "").trim();
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  if (value < MIN_BUDGET_VALUE || value > MAX_BUDGET_VALUE) {
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

function normalizeCaseLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function submitScreening(
  _prevState: ScreeningSubmitState,
  formData: FormData,
): Promise<ScreeningSubmitState> {
  "use server";

  const submitIntent = String(formData.get("submit_intent") ?? "").trim();

  if (submitIntent !== "submit_screening") {
    return {
      success: false,
      error: null,
      fieldErrors: {},
    };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/auth/login?redirect=/screening");
  }

  if (!auth.user.email) {
    return {
      success: false,
      error: "Authenticated email is required.",
      fieldErrors: {},
    };
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
    return {
      success: false,
      error: null,
      fieldErrors: {
        case_label: "Screening / case name must be at least 3 characters.",
      },
    };
  }

  if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone)) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        phone:
          "Phone must be in international format, for example +359888123456.",
      },
    };
  }

  if (!isOneOf(plan_interest, PLAN_INTEREST_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { plan_interest: "Plan interest is invalid." },
    };
  }

  if (!isOneOf(goal, GOAL_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { goal: "Investment objective is invalid." },
    };
  }

  if (!isOneOf(risk_tolerance, RISK_TOLERANCE_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { risk_tolerance: "Risk tolerance is invalid." },
    };
  }

  if (preferred_markets.length < 2) {
    return {
      success: false,
      error: null,
      fieldErrors: { preferred_markets: "Preferred markets are required." },
    };
  }

  if (!isOneOf(currency, CURRENCY_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { currency: "Currency is invalid." },
    };
  }

  const budget_min = parseBudgetNumber(budget_min_raw);
  const budget_max = parseBudgetNumber(budget_max_raw);

  if (budget_min === null) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        budget_min: "Minimum budget must be between 10,000 and 10,000,000.",
      },
    };
  }

  if (budget_max === null) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        budget_max: "Maximum budget must be between 10,000 and 10,000,000.",
      },
    };
  }

  if (budget_max < budget_min) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        budget_max:
          "Maximum budget must be greater than or equal to minimum budget.",
      },
    };
  }

  if (!isOneOf(decision_timeline, TIMELINE_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { decision_timeline: "Decision timeline is invalid." },
    };
  }

  if (!isOneOf(financing_type, FINANCING_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: { financing_type: "Financing type is invalid." },
    };
  }

  if (!isOneOf(property_identified, PROPERTY_IDENTIFIED_VALUES)) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        property_identified: "Property identified value is invalid.",
      },
    };
  }

  const hasPropertyIdentified = property_identified === "yes";

  if (hasPropertyIdentified) {
    if (!listing_url) {
      return {
        success: false,
        error: null,
        fieldErrors: {
          listing_url:
            "Listing URL is required when a property is already identified.",
        },
      };
    }

    try {
      const parsed = new URL(listing_url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return {
          success: false,
          error: null,
          fieldErrors: {
            listing_url: "Listing URL must start with http or https.",
          },
        };
      }
    } catch {
      return {
        success: false,
        error: null,
        fieldErrors: {
          listing_url: "Listing URL is invalid.",
        },
      };
    }
  }

  const budget_range = formatBudgetRange(currency, budget_min, budget_max);
  const normalizedCaseLabel = normalizeCaseLabel(case_label);

  const { data: existingRequests, error: existingRequestError } = await supabase
    .from("screening_requests")
    .select("id, name")
    .eq("user_id", auth.user.id);

  if (existingRequestError) {
    return {
      success: false,
      error: existingRequestError.message,
      fieldErrors: {},
    };
  }

  const hasDuplicateCaseLabel = (existingRequests ?? []).some((request) => {
    return normalizeCaseLabel(request.name ?? "") === normalizedCaseLabel;
  });

  if (hasDuplicateCaseLabel) {
    return {
      success: false,
      error: null,
      fieldErrors: {
        case_label: "You already have a screening with this name.",
      },
    };
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
    return {
      success: false,
      error: error.message,
      fieldErrors: {},
    };
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
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
