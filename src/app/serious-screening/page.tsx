import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SeriousScreeningForm from "./SeriousScreeningForm";
import {
    type FinancingValue,
    type IdentifiedPropertyValue,
    type MainWorryValue,
    type PropertyUseValue,
    type SeriousnessValue,
    type StageValue,
    type WhyGreeceValue,
    hasIdentifiedProperty,
    mapReadinessBudgetToLegacyRange,
    mapReadinessUseToLegacyGoal,
    mapSeriousnessToLegacyTimeline,
} from "@/lib/intake/readiness";

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readString(
    value: string | string[] | undefined,
    fallback: string,
) {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    return fallback;
}

function normalizeCaseLabel(value: string) {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export default async function SeriousScreeningPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(
            `/auth/login?redirect=${encodeURIComponent("/serious-screening")}`,
        );
    }

    const readiness = {
        whyGreece: readString(
            resolvedSearchParams.whyGreece,
            "better_life",
        ) as WhyGreeceValue,
        stage: readString(resolvedSearchParams.stage, "exploring") as StageValue,
        propertyUse: readString(
            resolvedSearchParams.propertyUse,
            "personal",
        ) as PropertyUseValue,
        budgetBand: readString(resolvedSearchParams.budgetBand, "not_sure"),
        financing: readString(
            resolvedSearchParams.financing,
            "have_funds",
        ) as FinancingValue,
        identifiedProperty: readString(
            resolvedSearchParams.identifiedProperty,
            "searching",
        ) as IdentifiedPropertyValue,
        seriousness: readString(
            resolvedSearchParams.seriousness,
            "just_browsing",
        ) as SeriousnessValue,
        mainWorry: readString(
            resolvedSearchParams.mainWorry,
            "everything",
        ) as MainWorryValue,
    };

    async function submitSeriousScreening(formData: FormData) {
        "use server";

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            redirect("/auth/login?redirect=/serious-screening");
        }

        const requestName = String(formData.get("request_name") ?? "").trim();
        const locationText = String(formData.get("location_text") ?? "").trim();
        const additionalContext =
            String(formData.get("additional_context") ?? "").trim() || null;
        const listingUrl = String(formData.get("listing_url") ?? "").trim() || null;

        if (requestName.length < 3) {
            throw new Error("Request name must be at least 3 characters.");
        }

        if (locationText.length < 2) {
            throw new Error("Location is required.");
        }

        if (listingUrl) {
            try {
                const parsed = new URL(listingUrl);
                if (!["http:", "https:"].includes(parsed.protocol)) {
                    throw new Error("Invalid listing URL");
                }
            } catch {
                throw new Error("Listing URL is invalid.");
            }
        }

        const readinessAnswers = {
            whyGreece: String(formData.get("whyGreece") ?? ""),
            stage: String(formData.get("stage") ?? ""),
            propertyUse: String(formData.get("propertyUse") ?? ""),
            budgetBand: String(formData.get("budgetBand") ?? ""),
            financing: String(formData.get("financing") ?? ""),
            identifiedProperty: String(formData.get("identifiedProperty") ?? ""),
            seriousness: String(formData.get("seriousness") ?? ""),
            mainWorry: String(formData.get("mainWorry") ?? ""),
        };

        const screeningAnswers = {
            mainFocus: String(formData.get("main_focus") ?? ""),
            situation: String(formData.get("situation") ?? ""),
            locationText,
            locationClarity: String(formData.get("location_clarity") ?? ""),
            propertyDifficulty: String(formData.get("property_difficulty") ?? ""),
            financingClarity: String(formData.get("financing_clarity") ?? ""),
            creditProgress: String(formData.get("credit_progress") ?? ""),
            equitySource: String(formData.get("equity_source") ?? ""),
            hasCreditAdvisor: String(formData.get("has_credit_advisor") ?? ""),
            cashCertainty: String(formData.get("cash_certainty") ?? ""),
            propertyType: String(formData.get("property_type") ?? ""),
            renovationTolerance: String(formData.get("renovation_tolerance") ?? ""),
            incomeImportance: String(formData.get("income_importance") ?? ""),
            creditCoverageImportance: String(
                formData.get("credit_coverage_importance") ?? "",
            ),
            successOutcome: String(formData.get("success_outcome") ?? ""),
            missingPiece: String(formData.get("missing_piece") ?? ""),
            helpType: String(formData.get("help_type") ?? ""),
            additionalContext,
            listingUrl,
        };

        const { label, min, max, currency } = mapReadinessBudgetToLegacyRange(
            readinessAnswers.budgetBand as Parameters<
                typeof mapReadinessBudgetToLegacyRange
            >[0],
        );

        const propertyIdentified = hasIdentifiedProperty(
            readinessAnswers.identifiedProperty as IdentifiedPropertyValue,
        );

        const goal = mapReadinessUseToLegacyGoal(
            readinessAnswers.propertyUse as PropertyUseValue,
        );

        const decisionTimeline = mapSeriousnessToLegacyTimeline(
            readinessAnswers.seriousness as SeriousnessValue,
        );

        const { data: existingRequests, error: existingRequestsError } =
            await supabase
                .from("screening_requests")
                .select("id, name")
                .eq("user_id", user.id);

        if (existingRequestsError) {
            throw new Error(existingRequestsError.message);
        }

        const normalizedRequestName = normalizeCaseLabel(requestName);
        const hasDuplicate = (existingRequests ?? []).some(
            (item) => normalizeCaseLabel(item.name ?? "") === normalizedRequestName,
        );

        if (hasDuplicate) {
            throw new Error("You already have a screening request with this name.");
        }

        const { error } = await supabase.from("screening_requests").insert({
            user_id: user.id,
            name: requestName,
            email: user.email ?? "",
            phone: null,
            budget_range: label,
            budget_min: min,
            budget_max: max,
            currency,
            financing_type: readinessAnswers.financing,
            goal,
            risk_tolerance: null,
            preferred_markets: locationText,
            decision_timeline: decisionTimeline,
            property_identified: propertyIdentified,
            listing_url: propertyIdentified ? listingUrl : null,
            plan_interest: "not_sure",
            notes: additionalContext,
            status: "new",
            readiness_answers: readinessAnswers,
            screening_answers: screeningAnswers,
            triage_result: null,
            recommended_plan: null,
            primary_blocker: null,
        });

        if (error) {
            throw new Error(error.message);
        }

        redirect("/serious-screening/submitted");
    }

    return (
        <section className="w-full">
            <SeriousScreeningForm action={submitSeriousScreening} readiness={readiness} />
        </section>
    );
}