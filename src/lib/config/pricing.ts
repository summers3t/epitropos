export const DEFAULT_OFFER_PRICING = {
    core: 750,
    strategic: 1500,
    additional_property: 200,
} as const;

export type OfferPlanType = "core" | "strategic";

export function isOfferPlanType(value: string): value is OfferPlanType {
    return value === "core" || value === "strategic";
}

export function getDefaultOfferPrice(planType: OfferPlanType) {
    return DEFAULT_OFFER_PRICING[planType];
}