"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "epitropos:screeningDraft:v1";

type Props = {
    isLoggedIn: boolean;
    action: (formData: FormData) => void;
};

type Draft = {
    name: string;
    email: string;
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
    name: "",
    email: "",
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
                name: parsed.name ?? "",
                email: parsed.email ?? "",
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
                    Name
                    <input
                        name="name"
                        required
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    />
                </label>

                <label className="block text-sm">
                    Email
                    <input
                        name="email"
                        type="email"
                        required
                        value={draft.email}
                        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    />
                </label>

                <label className="block text-sm">
                    Budget range
                    <input
                        name="budget_range"
                        value={draft.budget_range}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, budget_range: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                        placeholder="e.g. €80k–€120k"
                    />
                </label>

                <label className="block text-sm">
                    Financing
                    <select
                        name="financing_type"
                        value={draft.financing_type}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, financing_type: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    >
                        <option value="">Select</option>
                        <option value="cash">Cash</option>
                        <option value="financing">Financing</option>
                        <option value="mixed">Part cash / part financing</option>
                    </select>
                </label>

                <label className="block text-sm">
                    Goal
                    <select
                        name="goal"
                        value={draft.goal}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, goal: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    >
                        <option value="">Select</option>
                        <option value="investment">Investment</option>
                        <option value="personal">Personal use</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </label>

                <label className="block text-sm">
                    Property already identified?
                    <select
                        name="property_identified"
                        value={draft.property_identified}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, property_identified: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>
                </label>

                <label className="block text-sm">
                    Listing URL (optional)
                    <input
                        name="listing_url"
                        value={draft.listing_url}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, listing_url: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                        placeholder="Paste a property link if you already have one"
                    />
                </label>

                <label className="block text-sm">
                    Plan interest
                    <select
                        name="plan_interest"
                        value={draft.plan_interest}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, plan_interest: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    >
                        <option value="">Select</option>
                        <option value="core">Core Analysis</option>
                        <option value="strategic">Strategic Analysis</option>
                        <option value="not_sure">Not sure yet</option>
                    </select>
                </label>

                <label className="block text-sm">
                    Short description
                    <textarea
                        name="notes"
                        rows={5}
                        value={draft.notes}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
                    />
                </label>

                {isLoggedIn ? (
                    <button
                        type="submit"
                        className="rounded-xl bg-stone px-5 py-3 text-sm font-medium text-navy shadow-glass hover:opacity-95 transition"
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