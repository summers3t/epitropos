"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "epitropos:screeningDraft:v2";

type Props = {
  isLoggedIn: boolean;
  fullName: string;
  email: string;
  action: (formData: FormData) => void | Promise<void>;
};

type Draft = {
  case_label: string;
  phone: string;
  plan_interest: string;
  goal: string;
  risk_tolerance: string;
  preferred_markets: string;
  notes: string;
  currency: string;
  budget_min: string;
  budget_max: string;
  decision_timeline: string;
  financing_type: string;
  property_identified: string;
  listing_url: string;
  savedAt: number;
};

const emptyDraft: Draft = {
  case_label: "",
  phone: "",
  plan_interest: "",
  goal: "",
  risk_tolerance: "",
  preferred_markets: "",
  notes: "",
  currency: "EUR",
  budget_min: "",
  budget_max: "",
  decision_timeline: "",
  financing_type: "",
  property_identified: "",
  listing_url: "",
  savedAt: Date.now(),
};

const steps = ["Contact", "Objective", "Budget & Timeline", "Submit"] as const;

function isCaseLabelValid(value: string) {
  return value.trim().length >= 3;
}

function isPhoneValid(value: string) {
  if (!value.trim()) return true;
  return /^\+?[1-9]\d{7,14}$/.test(value.trim());
}

function isUrlValid(value: string) {
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parsePositiveNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const number = Number(normalized);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

function formatBudgetSummary(currency: string, min: string, max: string) {
  const minValue = parsePositiveNumber(min);
  const maxValue = parsePositiveNumber(max);

  if (minValue === null || maxValue === null) return "—";

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  });

  return `${currency} ${formatter.format(minValue)} - ${formatter.format(maxValue)}`;
}

export default function ScreeningForm({
  isLoggedIn,
  fullName,
  email,
  action,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<Draft>;
      const ageMs = Date.now() - Number(parsed.savedAt ?? 0);

      if (ageMs > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }

      setDraft({
        case_label: parsed.case_label ?? "",
        phone: parsed.phone ?? "",
        plan_interest: parsed.plan_interest ?? "",
        goal: parsed.goal ?? "",
        risk_tolerance: parsed.risk_tolerance ?? "",
        preferred_markets: parsed.preferred_markets ?? "",
        notes: parsed.notes ?? "",
        currency: parsed.currency ?? "EUR",
        budget_min: parsed.budget_min ?? "",
        budget_max: parsed.budget_max ?? "",
        decision_timeline: parsed.decision_timeline ?? "",
        financing_type: parsed.financing_type ?? "",
        property_identified: parsed.property_identified ?? "",
        listing_url: parsed.listing_url ?? "",
        savedAt: Number(parsed.savedAt ?? Date.now()),
      });
    } catch {
      // ignore invalid local draft
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...draft, savedAt: Date.now() }),
      );
    } catch {
      // ignore storage failures
    }
  }, [draft]);

  const loginUrl = useMemo(() => "/auth/login?redirect=/screening", []);

  const hasValidCaseLabel = isCaseLabelValid(draft.case_label);
  const hasValidPhone = isPhoneValid(draft.phone);
  const hasPlanInterest = draft.plan_interest.trim().length > 0;

  const unlockPhone = hasValidCaseLabel;
  const unlockPlanInterest = hasValidCaseLabel && hasValidPhone;

  const contactStepValid =
    hasValidCaseLabel &&
    hasValidPhone &&
    hasPlanInterest;

  const hasGoal = draft.goal.trim().length > 0;
  const unlockRiskTolerance = hasGoal;
  const hasRiskTolerance = draft.risk_tolerance.trim().length > 0;
  const unlockPreferredMarkets = hasGoal && hasRiskTolerance;
  const hasPreferredMarkets = draft.preferred_markets.trim().length >= 2;
  const unlockAdditionalContext = hasGoal && hasRiskTolerance && hasPreferredMarkets;

  const objectiveStepValid =
    hasGoal &&
    hasRiskTolerance &&
    hasPreferredMarkets;

  const hasCurrency = draft.currency.trim().length > 0;
  const unlockBudgetMin = hasCurrency;
  const budgetMinValue = parsePositiveNumber(draft.budget_min);
  const hasBudgetMin = budgetMinValue !== null;
  const unlockBudgetMax = hasCurrency && hasBudgetMin;
  const budgetMaxValue = parsePositiveNumber(draft.budget_max);
  const hasBudgetMax = budgetMaxValue !== null && budgetMinValue !== null && budgetMaxValue >= budgetMinValue;
  const unlockTimeline = hasCurrency && hasBudgetMin && hasBudgetMax;
  const hasTimeline = draft.decision_timeline.trim().length > 0;
  const unlockFinancingType = hasTimeline;
  const hasFinancingType = draft.financing_type.trim().length > 0;
  const unlockPropertyIdentified = hasTimeline && hasFinancingType;
  const hasPropertyIdentified = draft.property_identified.trim().length > 0;
  const needsListingUrl = draft.property_identified === "yes";
  const unlockListingUrl = hasPropertyIdentified && needsListingUrl;
  const hasListingUrl = !needsListingUrl || isUrlValid(draft.listing_url);

  const budgetStepValid =
    hasCurrency &&
    hasBudgetMin &&
    hasBudgetMax &&
    hasTimeline &&
    hasFinancingType &&
    hasPropertyIdentified &&
    hasListingUrl;

  const canAdvance =
    (stepIndex === 0 && contactStepValid) ||
    (stepIndex === 1 && objectiveStepValid) ||
    (stepIndex === 2 && budgetStepValid);

  const canSubmit =
    contactStepValid &&
    objectiveStepValid &&
    budgetStepValid;

  const goNext = () => {
    if (!canAdvance) return;
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const summaryRows = [
    { label: "Screening / case name", value: draft.case_label || "—" },
    { label: "Full name", value: isLoggedIn ? fullName || "—" : "Will populate after sign-in" },
    { label: "Email", value: isLoggedIn ? email || "—" : "Will populate after sign-in" },
    { label: "Phone", value: draft.phone || "—" },
    {
      label: "Plan interest",
      value:
        draft.plan_interest === "core"
          ? "Core Analysis"
          : draft.plan_interest === "strategic"
            ? "Strategic Analysis"
            : draft.plan_interest === "portfolio_review"
              ? "Portfolio Review"
              : draft.plan_interest === "not_sure"
                ? "Not sure yet"
                : "—",
    },
    {
      label: "Investment objective",
      value:
        draft.goal === "investment"
          ? "Investment"
          : draft.goal === "personal"
            ? "Personal use"
            : draft.goal === "hybrid"
              ? "Hybrid"
              : "—",
    },
    {
      label: "Risk tolerance",
      value:
        draft.risk_tolerance === "conservative"
          ? "Conservative"
          : draft.risk_tolerance === "moderate"
            ? "Moderate — balanced return and risk"
            : draft.risk_tolerance === "aggressive"
              ? "Aggressive"
              : "—",
    },
    { label: "Preferred markets", value: draft.preferred_markets || "—" },
    { label: "Budget", value: formatBudgetSummary(draft.currency, draft.budget_min, draft.budget_max) },
    {
      label: "Decision timeline",
      value:
        draft.decision_timeline === "within_30_days"
          ? "Within 30 days"
          : draft.decision_timeline === "within_3_months"
            ? "Within 3 months"
            : draft.decision_timeline === "within_6_months"
              ? "Within 6 months"
              : draft.decision_timeline === "within_12_months"
                ? "Within 12 months"
                : draft.decision_timeline === "flexible"
                  ? "Flexible"
                  : "—",
    },
    {
      label: "Financing",
      value:
        draft.financing_type === "cash"
          ? "Cash"
          : draft.financing_type === "financing"
            ? "Financing"
            : draft.financing_type === "mixed"
              ? "Part cash / part financing"
              : "—",
    },
    {
      label: "Property identified",
      value:
        draft.property_identified === "yes"
          ? "Yes"
          : draft.property_identified === "no"
            ? "No"
            : "—",
    },
    { label: "Listing URL", value: draft.property_identified === "yes" ? draft.listing_url || "—" : "—" },
    { label: "Additional context", value: draft.notes || "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <div className="pb-8">
        <p className="text-[11px] uppercase tracking-[0.30em] text-white/45">
          Screening
        </p>

        <h1
          className="mt-4 text-5xl leading-[1.02] text-white md:text-6xl"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {steps[stepIndex]}
        </h1>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {steps.map((_, index) => (
            <div key={index} className="h-px bg-white/10">
              <div
                className={[
                  "h-px bg-gold transition-all duration-500 ease-out",
                  index <= stepIndex ? "w-full opacity-100" : "w-0 opacity-0",
                ].join(" ")}
              />
            </div>
          ))}
        </div>
      </div>

      {!isLoggedIn ? (
        <div className="mb-8 border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/68">
          Sign in is required to submit, but your draft is preserved locally and restored after authentication.
        </div>
      ) : null}

      <form action={action} className="space-y-8">
        {stepIndex === 0 ? (
          <section className="space-y-8">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Screening / Case Name
              </label>
              <input
                value={draft.case_label}
                onChange={(e) => setDraft((current) => ({ ...current, case_label: e.target.value }))}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60"
                placeholder="e.g. Thessaloniki Income Project"
              />
              {!hasValidCaseLabel && draft.case_label.length > 0 ? (
                <p className="mt-2 text-xs text-red-200/80">
                  Use at least 3 characters.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Full Name
              </label>
              <input
                value={isLoggedIn ? fullName : ""}
                readOnly
                disabled
                className="mt-3 w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white/80 outline-none disabled:cursor-not-allowed"
                placeholder={isLoggedIn ? "" : "Will populate after sign-in"}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Email Address
              </label>
              <input
                value={isLoggedIn ? email : ""}
                readOnly
                disabled
                className="mt-3 w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white/80 outline-none disabled:cursor-not-allowed"
                placeholder={isLoggedIn ? "" : "Will populate after sign-in"}
              />
            </div>

            <div className={unlockPhone ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Phone (Optional)
              </label>
              <input
                value={draft.phone}
                onChange={(e) => setDraft((current) => ({ ...current, phone: e.target.value }))}
                disabled={!unlockPhone}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
                placeholder="+359..."
              />
              {!hasValidPhone && draft.phone.length > 0 ? (
                <p className="mt-2 text-xs text-red-200/80">
                  Use international format, for example +359...
                </p>
              ) : null}
            </div>

            <div className={unlockPlanInterest ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Plan Interest
              </label>
              <select
                value={draft.plan_interest}
                onChange={(e) => setDraft((current) => ({ ...current, plan_interest: e.target.value }))}
                disabled={!unlockPlanInterest}
                className="mt-3 w-full border border-gold/40 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold disabled:cursor-not-allowed"
              >
                <option value="">Select</option>
                <option value="core">Core Analysis</option>
                <option value="strategic">Strategic Analysis</option>
                <option value="portfolio_review">Portfolio Review</option>
                <option value="not_sure">Not sure yet</option>
              </select>
            </div>
          </section>
        ) : null}

        {stepIndex === 1 ? (
          <section className="space-y-8">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Investment Objective
              </label>
              <select
                value={draft.goal}
                onChange={(e) => setDraft((current) => ({ ...current, goal: e.target.value }))}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60"
              >
                <option value="">Select</option>
                <option value="investment">Investment</option>
                <option value="personal">Personal use</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div className={unlockRiskTolerance ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Risk Tolerance
              </label>
              <select
                value={draft.risk_tolerance}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, risk_tolerance: e.target.value }))
                }
                disabled={!unlockRiskTolerance}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
              >
                <option value="">Select</option>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate — balanced return and risk</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div className={unlockPreferredMarkets ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Preferred Markets / Regions
              </label>
              <input
                value={draft.preferred_markets}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, preferred_markets: e.target.value }))
                }
                disabled={!unlockPreferredMarkets}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
                placeholder="Separate multiple markets with commas"
              />
            </div>

            <div className={unlockAdditionalContext ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Additional Context
              </label>
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
                disabled={!unlockAdditionalContext}
                className="mt-3 w-full border border-gold/40 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold disabled:cursor-not-allowed"
                placeholder="Any specific circumstances, constraints, or objectives we should be aware of..."
              />
            </div>
          </section>
        ) : null}

        {stepIndex === 2 ? (
          <section className="space-y-8">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Currency
              </label>
              <select
                value={draft.currency}
                onChange={(e) => setDraft((current) => ({ ...current, currency: e.target.value }))}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60"
              >
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className={unlockBudgetMin ? "" : "opacity-45"}>
                <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Budget Minimum
                </label>
                <input
                  value={draft.budget_min}
                  onChange={(e) => setDraft((current) => ({ ...current, budget_min: e.target.value }))}
                  disabled={!unlockBudgetMin}
                  inputMode="decimal"
                  className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
                  placeholder="80000"
                />
              </div>

              <div className={unlockBudgetMax ? "" : "opacity-45"}>
                <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Budget Maximum
                </label>
                <input
                  value={draft.budget_max}
                  onChange={(e) => setDraft((current) => ({ ...current, budget_max: e.target.value }))}
                  disabled={!unlockBudgetMax}
                  inputMode="decimal"
                  className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
                  placeholder="120000"
                />
                {draft.budget_max.length > 0 && !hasBudgetMax ? (
                  <p className="mt-2 text-xs text-red-200/80">
                    Maximum budget must be greater than or equal to minimum budget.
                  </p>
                ) : null}
              </div>
            </div>

            <div className={unlockTimeline ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Decision Timeline
              </label>
              <select
                value={draft.decision_timeline}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, decision_timeline: e.target.value }))
                }
                disabled={!unlockTimeline}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
              >
                <option value="">Select</option>
                <option value="within_30_days">Within 30 days</option>
                <option value="within_3_months">Within 3 months</option>
                <option value="within_6_months">Within 6 months</option>
                <option value="within_12_months">Within 12 months</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <div className={unlockFinancingType ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Financing
              </label>
              <select
                value={draft.financing_type}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, financing_type: e.target.value }))
                }
                disabled={!unlockFinancingType}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
              >
                <option value="">Select</option>
                <option value="cash">Cash</option>
                <option value="financing">Financing</option>
                <option value="mixed">Part cash / part financing</option>
              </select>
            </div>

            <div className={unlockPropertyIdentified ? "" : "opacity-45"}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                Property Already Identified?
              </label>
              <select
                value={draft.property_identified}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    property_identified: e.target.value,
                    listing_url: e.target.value === "yes" ? current.listing_url : "",
                  }))
                }
                disabled={!unlockPropertyIdentified}
                className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold/60 disabled:cursor-not-allowed"
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            {draft.property_identified === "yes" ? (
              <div className={unlockListingUrl ? "" : "opacity-45"}>
                <label className="block text-[11px] uppercase tracking-[0.22em] text-white/55">
                  Listing URL
                </label>
                <input
                  value={draft.listing_url}
                  onChange={(e) =>
                    setDraft((current) => ({ ...current, listing_url: e.target.value }))
                  }
                  disabled={!unlockListingUrl}
                  className="mt-3 w-full border border-gold/40 bg-transparent px-4 py-3 text-base text-white outline-none transition focus:border-gold disabled:cursor-not-allowed"
                  placeholder="Paste a property link"
                />
                {draft.listing_url.length > 0 && !hasListingUrl ? (
                  <p className="mt-2 text-xs text-red-200/80">
                    Enter a valid http or https URL.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {stepIndex === 3 ? (
          <section className="space-y-8">
            <div className="border border-white/10">
              {summaryRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid gap-4 px-4 py-4 md:grid-cols-[180px_1fr] md:px-5 ${
                    index < summaryRows.length - 1 ? "border-b border-white/10" : ""
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.20em] text-white/50">
                    {row.label}
                  </div>
                  <div className="text-base text-white/88">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            <p className="max-w-[760px] text-sm leading-7 text-white/62">
              By submitting, you authorize Epitropos to review your intake and respond within one business day.
              There is no obligation to proceed.
            </p>
          </section>
        ) : null}

        <input type="hidden" name="case_label" value={draft.case_label} />
        <input type="hidden" name="phone" value={draft.phone} />
        <input type="hidden" name="plan_interest" value={draft.plan_interest} />
        <input type="hidden" name="goal" value={draft.goal} />
        <input type="hidden" name="risk_tolerance" value={draft.risk_tolerance} />
        <input type="hidden" name="preferred_markets" value={draft.preferred_markets} />
        <input type="hidden" name="notes" value={draft.notes} />
        <input type="hidden" name="currency" value={draft.currency} />
        <input type="hidden" name="budget_min" value={draft.budget_min} />
        <input type="hidden" name="budget_max" value={draft.budget_max} />
        <input type="hidden" name="decision_timeline" value={draft.decision_timeline} />
        <input type="hidden" name="financing_type" value={draft.financing_type} />
        <input type="hidden" name="property_identified" value={draft.property_identified} />
        <input type="hidden" name="listing_url" value={draft.listing_url} />

        <div className="flex items-center justify-between gap-4 pt-2">
          <div>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="text-[12px] uppercase tracking-[0.16em] text-white/58 transition hover:text-white"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
          </div>

          <div>
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className="inline-flex items-center rounded-md bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue →
              </button>
            ) : isLoggedIn ? (
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center rounded-md border border-gold bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit Screening →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(
                      DRAFT_KEY,
                      JSON.stringify({ ...draft, savedAt: Date.now() }),
                    );
                  } catch {
                    // ignore storage failures
                  }

                  router.push(loginUrl);
                }}
                disabled={!canSubmit}
                className="inline-flex items-center rounded-md bg-stone px-7 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-navy transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue → Sign in to apply
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export { DRAFT_KEY };