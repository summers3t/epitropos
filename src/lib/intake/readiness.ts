export type WhyGreeceValue =
    | "better_life"
    | "personal_use"
    | "investment"
    | "future_move"
    | "combination"
    | "not_formulated";

export type StageValue =
    | "exploring"
    | "city_known"
    | "areas_reviewed";

export type PropertyUseValue =
    | "personal"
    | "ltr"
    | "str"
    | "hybrid"
    | "not_sure";

export type BudgetBandValue =
    | "up_to_80k"
    | "from_80k_to_120k"
    | "from_120k_to_200k"
    | "over_200k"
    | "not_sure";

export type FinancingValue =
    | "have_funds"
    | "cash_plus_credit"
    | "mostly_credit"
    | "dont_know"
    | "not_checked";

export type IdentifiedPropertyValue =
    | "yes"
    | "several"
    | "searching";

export type SeriousnessValue =
    | "just_browsing"
    | "within_12_months"
    | "within_3_to_6_months"
    | "already_in_process";

export type MainWorryValue =
    | "overpay"
    | "bad_area"
    | "documents"
    | "financing"
    | "wrong_property"
    | "everything";

export type ReadinessAnswers = {
    whyGreece: WhyGreeceValue;
    stage: StageValue;
    propertyUse: PropertyUseValue;
    budgetBand: BudgetBandValue;
    financing: FinancingValue;
    identifiedProperty: IdentifiedPropertyValue;
    seriousness: SeriousnessValue;
    mainWorry: MainWorryValue;
};

export const READINESS_WHY_OPTIONS: {
    value: WhyGreeceValue;
    label: string;
}[] = [
        { value: "better_life", label: "По-добра среда за живот" },
        { value: "personal_use", label: "Нещо за лично ползване" },
        { value: "investment", label: "Инвестиция / доходност" },
        { value: "future_move", label: "Бъдещо местене" },
        { value: "combination", label: "Комбинация от няколко" },
        {
            value: "not_formulated",
            label: "Още не съм го формулирал, но знам че искам",
        },
    ];

export const READINESS_STAGE_OPTIONS: {
    value: StageValue;
    label: string;
}[] = [
        { value: "exploring", label: "Още проучвам" },
        { value: "city_known", label: "Знам кой град ме интересува" },
        { value: "areas_reviewed", label: "Гледам конкретни райони" },
    ];

export const READINESS_USE_OPTIONS: {
    value: PropertyUseValue;
    label: string;
}[] = [
        { value: "personal", label: "За лично ползване" },
        { value: "ltr", label: "За дългосрочен наем" },
        { value: "str", label: "За краткосрочен наем" },
        {
            value: "hybrid",
            label: "В комбинация от краткосрочен наем и лично ползване",
        },
        { value: "not_sure", label: "Още не знам" },
    ];

export const READINESS_BUDGET_OPTIONS: {
    value: BudgetBandValue;
    label: string;
}[] = [
        { value: "up_to_80k", label: "До €80,000" },
        { value: "from_80k_to_120k", label: "€80,000 – €120,000" },
        { value: "from_120k_to_200k", label: "€120,000 – €200,000" },
        { value: "over_200k", label: "€200,000+" },
        { value: "not_sure", label: "Още не съм сигурен" },
    ];

export const READINESS_FINANCING_OPTIONS: {
    value: FinancingValue;
    label: string;
}[] = [
        { value: "have_funds", label: "Имам необходимите средства" },
        { value: "cash_plus_credit", label: "Лични средства + кредит" },
        { value: "mostly_credit", label: "Основно с кредит" },
        { value: "dont_know", label: "Още не знам" },
        { value: "not_checked", label: "Още не съм проверявал" },
    ];

export const READINESS_IDENTIFIED_OPTIONS: {
    value: IdentifiedPropertyValue;
    label: string;
}[] = [
        { value: "yes", label: "Да" },
        { value: "several", label: "Имам няколко варианта" },
        { value: "searching", label: "Не, още съм на етап търсене" },
    ];

export const READINESS_SERIOUSNESS_OPTIONS: {
    value: SeriousnessValue;
    label: string;
}[] = [
        { value: "just_browsing", label: "Просто разглеждам" },
        { value: "within_12_months", label: "Мисля го в следващите 12 месеца" },
        {
            value: "within_3_to_6_months",
            label: "Искам да действам в следващите 3–6 месеца",
        },
        { value: "already_in_process", label: "Вече съм в процес" },
    ];

export const READINESS_WORRY_OPTIONS: {
    value: MainWorryValue;
    label: string;
}[] = [
        { value: "overpay", label: "Да не надплатя" },
        { value: "bad_area", label: "Да не избера лош район" },
        { value: "documents", label: "Да не се объркам с документите" },
        { value: "financing", label: "Да не сгреша с финансирането" },
        { value: "wrong_property", label: "Да не купя неподходящ имот" },
        { value: "everything", label: "Всичко по малко" },
    ];

export function budgetBandLabel(value: BudgetBandValue) {
    return (
        READINESS_BUDGET_OPTIONS.find((item) => item.value === value)?.label ?? "—"
    );
}

export function financingLabel(value: FinancingValue) {
    return (
        READINESS_FINANCING_OPTIONS.find((item) => item.value === value)?.label ??
        "—"
    );
}

export function useLabel(value: PropertyUseValue) {
    return (
        READINESS_USE_OPTIONS.find((item) => item.value === value)?.label ?? "—"
    );
}

export function stageLabel(value: StageValue) {
    return (
        READINESS_STAGE_OPTIONS.find((item) => item.value === value)?.label ?? "—"
    );
}

export function identifiedPropertyLabel(value: IdentifiedPropertyValue) {
    return (
        READINESS_IDENTIFIED_OPTIONS.find((item) => item.value === value)?.label ??
        "—"
    );
}

export function seriousnessLabel(value: SeriousnessValue) {
    return (
        READINESS_SERIOUSNESS_OPTIONS.find((item) => item.value === value)?.label ??
        "—"
    );
}

export function whyGreeceLabel(value: WhyGreeceValue) {
    return (
        READINESS_WHY_OPTIONS.find((item) => item.value === value)?.label ?? "—"
    );
}

export function mainWorryLabel(value: MainWorryValue) {
    return (
        READINESS_WORRY_OPTIONS.find((item) => item.value === value)?.label ?? "—"
    );
}

export function buildSeriousScreeningPath(answers: ReadinessAnswers) {
    const params = new URLSearchParams({
        whyGreece: answers.whyGreece,
        stage: answers.stage,
        propertyUse: answers.propertyUse,
        budgetBand: answers.budgetBand,
        financing: answers.financing,
        identifiedProperty: answers.identifiedProperty,
        seriousness: answers.seriousness,
        mainWorry: answers.mainWorry,
    });

    return `/serious-screening?${params.toString()}`;
}

export function getReadinessResult(answers: ReadinessAnswers) {
    const isVeryEarly =
        answers.stage === "exploring" &&
        answers.identifiedProperty === "searching" &&
        (answers.financing === "dont_know" || answers.financing === "not_checked");

    if (isVeryEarly) {
        return {
            statusTitle: "Още сте в ориентировъчен етап",
            insight:
                "Изглежда интересът е реален, но все още липсва работеща рамка за район, финансиране и тип имот.",
            nextStep:
                "Следващата разумна стъпка е да запазите резултата си и да продължите към по-сериозния screening.",
        };
    }

    if (
        answers.financing === "mostly_credit" ||
        answers.financing === "dont_know" ||
        answers.financing === "not_checked"
    ) {
        return {
            statusTitle: "Имате потенциал, но първо трябва да изчистите една ключова стъпка",
            insight:
                "При този тип покупка финансовата яснота много често решава какво изобщо е реалистично.",
            nextStep:
                "Продължете нататък, за да видим дали случаят е подходящ за Foundation, Evaluation или Guidance.",
        };
    }

    if (
        answers.identifiedProperty === "yes" ||
        answers.identifiedProperty === "several"
    ) {
        return {
            statusTitle: "Изглежда сте близо до етап за реален анализ",
            insight:
                "Вече има достатъчно сигнал, че следващият риск не е само в търсенето, а в преценката дали конкретният имот наистина си струва.",
            nextStep:
                "Запазете резултата си и продължете към Serious Screening.",
        };
    }

    if (answers.propertyUse === "not_sure") {
        return {
            statusTitle: "Имате интерес, но още не и ясен модел",
            insight:
                "Когато целта не е изчистена, човек лесно започва да сравнява несравними имоти и райони.",
            nextStep:
                "Продължете към Serious Screening, за да изчистим кой е правилният тип помощ.",
        };
    }

    return {
        statusTitle: "Вече изглеждате като случай, който си струва да продължи нататък",
        insight:
            "Имате достатъчно сигнал за реален следващ етап, но още не и достатъчно яснота, за да действате уверено на сляпо.",
        nextStep:
            "Запазете резултата си и продължете към Serious Screening.",
    };
}

export function isCreditScenario(financing: FinancingValue) {
    return (
        financing === "cash_plus_credit" || financing === "mostly_credit"
    );
}

export function isIncomeDrivenUse(propertyUse: PropertyUseValue) {
    return propertyUse === "ltr" || propertyUse === "str" || propertyUse === "hybrid";
}

export function hasIdentifiedProperty(value: IdentifiedPropertyValue) {
    return value === "yes" || value === "several";
}

export function mapReadinessBudgetToLegacyRange(value: BudgetBandValue) {
    switch (value) {
        case "up_to_80k":
            return { label: "Up to EUR 80,000", min: 10000, max: 80000, currency: "EUR" };
        case "from_80k_to_120k":
            return { label: "EUR 80,000 - 120,000", min: 80000, max: 120000, currency: "EUR" };
        case "from_120k_to_200k":
            return { label: "EUR 120,000 - 200,000", min: 120000, max: 200000, currency: "EUR" };
        case "over_200k":
            return { label: "EUR 200,000+", min: 200000, max: 500000, currency: "EUR" };
        case "not_sure":
        default:
            return { label: "Not sure", min: null, max: null, currency: "EUR" };
    }
}

export function mapReadinessUseToLegacyGoal(value: PropertyUseValue) {
    switch (value) {
        case "personal":
            return "personal";
        case "ltr":
        case "str":
            return "investment";
        case "hybrid":
            return "hybrid";
        case "not_sure":
        default:
            return "hybrid";
    }
}

export function mapSeriousnessToLegacyTimeline(value: SeriousnessValue) {
    switch (value) {
        case "within_3_to_6_months":
            return "within_6_months";
        case "within_12_months":
            return "within_12_months";
        case "already_in_process":
            return "within_3_months";
        case "just_browsing":
        default:
            return "flexible";
    }
}