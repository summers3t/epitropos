"use client";

import { useState } from "react";
import {
    DEFAULT_OFFER_PRICING,
    type OfferPlanType,
} from "@/lib/config/pricing";

type Props = {
    initialPlanType: OfferPlanType | "";
    initialPriceAmount: string;
    action: (formData: FormData) => void;
};

export default function OfferDraftForm({
    initialPlanType,
    initialPriceAmount,
    action,
}: Props) {
    const [planType, setPlanType] = useState<OfferPlanType | "">(initialPlanType);
    const [priceAmount, setPriceAmount] = useState(initialPriceAmount);

    function handlePlanChange(value: string) {
        const nextPlanType = value as OfferPlanType | "";
        setPlanType(nextPlanType);

        if (nextPlanType === "core" || nextPlanType === "strategic") {
            setPriceAmount(String(DEFAULT_OFFER_PRICING[nextPlanType]));
        } else {
            setPriceAmount("");
        }
    }

    return (
        <form action={action} className="space-y-4">
            <label className="block text-sm">
                Plan type
                <select
                    name="plan_type"
                    value={planType}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 outline-none"
                    required
                >
                    <option value="">Select</option>
                    <option value="core">Core Analysis</option>
                    <option value="strategic">Strategic Analysis</option>
                </select>
            </label>

            <label className="block text-sm">
                Price amount
                <input
                    name="price_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 outline-none"
                    required
                />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/75">
                Currency: EUR
                <br />
                Offer status on save: Draft
            </div>

            <button
                type="submit"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 transition"
            >
                Save draft offer
            </button>
        </form>
    );
}