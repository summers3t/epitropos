"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "epitropos:screeningDraft:v1";

type Props = {
    isLoggedIn: boolean;
    action: (formData: FormData) => void;
};

type Draft = {
    case_label: string;
    budget_range: string;
    financing_type: string;
    goal: string;
    property_identified: string;
    listing_url: string;
    plan_interest: string;
    notes: string;
    savedAt: number;
};

const emptyDraft: Draft = {
    case_label: "",
    budget_range: "",
    financing_type: "",
    goal: "",
    property_identified: "no",
    listing_url: "",
    plan_interest: "",
    notes: "",
    savedAt: Date.now(),
};

export default function ScreeningForm({ isLoggedIn, action }: Props) {
    const router = useRouter();
    const [draft, setDraft] = useState<Draft>(emptyDraft);

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
                budget_range: parsed.budget_range ?? "",
                financing_type: parsed.financing_type ?? "",
                goal: parsed.goal ?? "",
                property_identified: parsed.property_identified ?? "no",
                listing_url: parsed.listing_url ?? "",
                plan_interest: parsed.plan_interest ?? "",
                notes: parsed.notes ?? "",
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
                JSON.stringify({ ...draft, savedAt: Date.now() })
            );
        } catch {
            // ignore storage failures
        }
    }, [draft]);

    const loginUrl = useMemo(() => "/auth/login?redirect=/screening", []);

    const hasCaseLabel = draft.case_label.trim().length > 0;
    const hasBudgetRange = draft.budget_range.trim().length > 0;
    const hasFinancingType = draft.financing_type.trim().length > 0;
    const hasGoal = draft.goal.trim().length > 0;
    const hasPropertyIdentified = draft.property_identified.trim().length > 0;
    const needsListingUrl = draft.property_identified === "yes";
    const hasListingUrl = draft.listing_url.trim().length > 0;
    const hasPlanInterest = draft.plan_interest.trim().length > 0;

    const unlockBudgetRange = hasCaseLabel;
    const unlockFinancingType = hasBudgetRange;
    const unlockGoal = hasFinancingType;
    const unlockPropertyIdentified = hasGoal;
    const unlockListingUrl = unlockPropertyIdentified && needsListingUrl;
    const unlockPlanInterest =
        draft.property_identified === "no"
            ? hasPropertyIdentified
            : hasListingUrl;
    const unlockNotes = hasPlanInterest;
    const canSubmit =
        hasCaseLabel &&
        hasBudgetRange &&
        hasFinancingType &&
        hasGoal &&
        hasPropertyIdentified &&
        (draft.property_identified === "no" || hasListingUrl) &&
        hasPlanInterest;

    return (
        <>
            {!isLoggedIn && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                    <div className="font-medium">Sign in required to apply</div>
                    <div className="mt-1 opacity-70">
                        Fill the form now. Continue and sign in with Google to apply.
                    </div>
                </div>
            )}

            <form action={action} className="mt-8 space-y-4">
                <label className="block text-sm">
                    Screening / case name
                    <input
                        name="case_label"
                        required
                        value={draft.case_label}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, case_label: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                        placeholder="e.g. Thessaloniki Income Project 1"
                    />
                </label>

                <label className={`block text-sm ${unlockBudgetRange ? "" : "opacity-50"}`}>
                    Budget range
                    <input
                        name="budget_range"
                        value={draft.budget_range}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, budget_range: e.target.value }))
                        }
                        disabled={!unlockBudgetRange}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="e.g. €80k–€120k"
                    />
                </label>

                <label className={`block text-sm ${unlockFinancingType ? "" : "opacity-50"}`}>
                    Financing
                    <select
                        name="financing_type"
                        value={draft.financing_type}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, financing_type: e.target.value }))
                        }
                        disabled={!unlockFinancingType}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="">Select</option>
                        <option value="cash">Cash</option>
                        <option value="financing">Financing</option>
                        <option value="mixed">Part cash / part financing</option>
                    </select>
                </label>

                <label className={`block text-sm ${unlockGoal ? "" : "opacity-50"}`}>
                    Goal
                    <select
                        name="goal"
                        value={draft.goal}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, goal: e.target.value }))
                        }
                        disabled={!unlockGoal}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="">Select</option>
                        <option value="investment">Investment</option>
                        <option value="personal">Personal use</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </label>

                <label className={`block text-sm ${unlockPropertyIdentified ? "" : "opacity-50"}`}>
                    Property already identified?
                    <select
                        name="property_identified"
                        value={draft.property_identified}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, property_identified: e.target.value }))
                        }
                        disabled={!unlockPropertyIdentified}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>
                </label>

                {draft.property_identified === "yes" ? (
                    <label className={`block text-sm ${unlockListingUrl ? "" : "opacity-50"}`}>
                        Listing URL
                        <input
                            name="listing_url"
                            value={draft.listing_url}
                            onChange={(e) =>
                                setDraft((d) => ({ ...d, listing_url: e.target.value }))
                            }
                            disabled={!unlockListingUrl}
                            className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            placeholder="Paste a property link if you already have one"
                        />
                    </label>
                ) : null}

                <label className={`block text-sm ${unlockPlanInterest ? "" : "opacity-50"}`}>
                    Plan interest
                    <select
                        name="plan_interest"
                        value={draft.plan_interest}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, plan_interest: e.target.value }))
                        }
                        disabled={!unlockPlanInterest}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="">Select</option>
                        <option value="core">Core Analysis</option>
                        <option value="strategic">Strategic Analysis</option>
                        <option value="not_sure">Not sure yet</option>
                    </select>
                </label>

                <label className={`block text-sm ${unlockNotes ? "" : "opacity-50"}`}>
                    Short description <span className="opacity-60">(optional)</span>
                    <textarea
                        name="notes"
                        rows={5}
                        value={draft.notes}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        disabled={!unlockNotes}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </label>

                {isLoggedIn ? (
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="rounded-xl bg-stone px-5 py-3 text-sm font-medium text-navy shadow-glass hover:opacity-95 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Apply for Screening
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                localStorage.setItem(
                                    DRAFT_KEY,
                                    JSON.stringify({ ...draft, savedAt: Date.now() })
                                );
                            } catch { }
                            router.push(loginUrl);
                        }}
                        className="rounded-xl bg-stone px-5 py-3 text-sm font-medium text-navy shadow-glass hover:opacity-95 transition"
                    >
                        Continue → Sign in to apply
                    </button>
                )}
            </form>
        </>
    );
}

export { DRAFT_KEY };