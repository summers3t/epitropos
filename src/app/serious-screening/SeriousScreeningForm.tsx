"use client";

import { useMemo, useState } from "react";
import ProgressSteps from "@/components/intake/ProgressSteps";
import ScreeningCardShell from "@/components/intake/ScreeningCardShell";
import {
    hasIdentifiedProperty,
    isCreditScenario,
    isIncomeDrivenUse,
    mainWorryLabel,
    seriousnessLabel,
    stageLabel,
    type FinancingValue,
    type IdentifiedPropertyValue,
    type MainWorryValue,
    type PropertyUseValue,
    type SeriousnessValue,
    type StageValue,
    type WhyGreeceValue,
    useLabel,
    whyGreeceLabel,
} from "@/lib/intake/readiness";

type Props = {
    action: (formData: FormData) => void;
    readiness: {
        whyGreece: WhyGreeceValue;
        stage: StageValue;
        propertyUse: PropertyUseValue;
        budgetBand: string;
        financing: FinancingValue;
        identifiedProperty: IdentifiedPropertyValue;
        seriousness: SeriousnessValue;
        mainWorry: MainWorryValue;
    };
};

export default function SeriousScreeningForm({ action, readiness }: Props) {
    const [requestName, setRequestName] = useState("");
    const [mainFocus, setMainFocus] = useState("everything");
    const [situation, setSituation] = useState("need_structure");
    const [locationClarity, setLocationClarity] = useState("city_only");
    const [propertyDifficulty, setPropertyDifficulty] = useState("not_there_yet");
    const [financingClarity, setFinancingClarity] = useState("partly_clear");
    const [creditProgress, setCreditProgress] = useState("researching");
    const [equitySource, setEquitySource] = useState("not_sure");
    const [hasCreditAdvisor, setHasCreditAdvisor] = useState("no_but_looking");
    const [cashCertainty, setCashCertainty] = useState("mostly_secure");
    const [propertyType, setPropertyType] = useState("apartment");
    const [renovationTolerance, setRenovationTolerance] = useState("moderate");
    const [incomeImportance, setIncomeImportance] = useState("important");
    const [creditCoverageImportance, setCreditCoverageImportance] = useState("desirable");
    const [successOutcome, setSuccessOutcome] = useState("clear_target");
    const [missingPiece, setMissingPiece] = useState("clear_direction");
    const [helpType, setHelpType] = useState("not_sure");
    const [locationText, setLocationText] = useState("");
    const [listingUrl, setListingUrl] = useState("");
    const [additionalContext, setAdditionalContext] = useState("");

    const isCredit = useMemo(
        () => isCreditScenario(readiness.financing),
        [readiness.financing],
    );

    const isIncomeDriven = useMemo(
        () => isIncomeDrivenUse(readiness.propertyUse),
        [readiness.propertyUse],
    );

    const propertyKnown = useMemo(
        () => hasIdentifiedProperty(readiness.identifiedProperty),
        [readiness.identifiedProperty],
    );

    return (
        <div className="space-y-6">
            <ProgressSteps
                steps={["Readiness Check", "Serious Screening", "Review"]}
                current={1}
            />

            <ScreeningCardShell
                eyebrow="Serious Screening"
                title="Нека подредим случая ви малко по-сериозно"
                description="Тук вече не търсим общ интерес, а достатъчно яснота, за да преценим кой е най-разумният следващ етап."
            >
                <form action={action} className="space-y-8">
                    <input type="hidden" name="whyGreece" value={readiness.whyGreece} />
                    <input type="hidden" name="stage" value={readiness.stage} />
                    <input type="hidden" name="propertyUse" value={readiness.propertyUse} />
                    <input type="hidden" name="budgetBand" value={readiness.budgetBand} />
                    <input type="hidden" name="financing" value={readiness.financing} />
                    <input
                        type="hidden"
                        name="identifiedProperty"
                        value={readiness.identifiedProperty}
                    />
                    <input type="hidden" name="seriousness" value={readiness.seriousness} />
                    <input type="hidden" name="mainWorry" value={readiness.mainWorry} />

                    <section className="rounded-[24px] border border-white/10 bg-black/10 p-5">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                            What we already know
                        </div>
                        <dl className="mt-4 grid gap-3 md:grid-cols-2">
                            <SummaryItem label="Why Greece" value={whyGreeceLabel(readiness.whyGreece)} />
                            <SummaryItem label="Current stage" value={stageLabel(readiness.stage)} />
                            <SummaryItem label="Property use" value={useLabel(readiness.propertyUse)} />
                            <SummaryItem label="Financing" value={readiness.financing} />
                            <SummaryItem
                                label="Property identified"
                                value={readiness.identifiedProperty}
                            />
                            <SummaryItem
                                label="Urgency"
                                value={seriousnessLabel(readiness.seriousness)}
                            />
                            <SummaryItem
                                label="Main worry"
                                value={mainWorryLabel(readiness.mainWorry)}
                            />
                            <SummaryItem label="Budget band" value={readiness.budgetBand} />
                        </dl>
                    </section>

                    <TextField
                        label="1. Дайте кратко име на този случай"
                        name="request_name"
                        value={requestName}
                        onChange={setRequestName}
                        placeholder="Например: Thessaloniki first purchase"
                        required
                    />

                    <QuestionGroup title="2. Кое е водещо за вас в момента?">
                        {[
                            ["find_area", "Да намеря правилния район"],
                            ["check_budget", "Да проверя дали бюджетът ми е достатъчен"],
                            ["choose_type", "Да избера правилния тип имот"],
                            ["avoid_bad_deal", "Да не се подведа по лоша оферта"],
                            ["smooth_process", "Да се уверя, че процесът ще премине гладко"],
                            ["everything", "Всичко изброено"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={mainFocus === value}
                                onClick={() => setMainFocus(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="main_focus" value={mainFocus} />
                    </QuestionGroup>

                    <QuestionGroup title="3. Кое от следните най-добре описва ситуацията ви в момента?">
                        {[
                            ["need_structure", "Имам интерес, но още нямам подреден план"],
                            ["have_direction", "Имам посока, но не съм сигурен дали е правилната"],
                            ["need_asset_judgement", "Имам конкретен имот или варианти, но не знам дали си струват"],
                            ["need_guidance", "Искам да купя, но не искам да минавам през процеса сам"],
                            ["active_risk", "Вече съм тръгнал по сделка и искам да избегна грешка"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={situation === value}
                                onClick={() => setSituation(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="situation" value={situation} />
                    </QuestionGroup>

                    <TextField
                        label="4. Кой град или район ви интересува най-много в момента?"
                        name="location_text"
                        value={locationText}
                        onChange={setLocationText}
                        placeholder="Например: Thessaloniki, Analipsi / Mpotsari / Voulgari"
                        required
                    />

                    <QuestionGroup title="5. Колко изчистен е изборът ви на локация?">
                        {[
                            ["city_only", "Имам град, но още не и район"],
                            ["between_areas", "Колебая се между няколко района"],
                            ["almost_clear", "Районът е почти избистрен"],
                            ["need_validation", "Районът е ясен, но не съм сигурен дали е правилният за целта ми"],
                            ["cant_compare", "Все още не знам как да сравня локациите"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={locationClarity === value}
                                onClick={() => setLocationClarity(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="location_clarity" value={locationClarity} />
                    </QuestionGroup>

                    <QuestionGroup title="6. Ако вече гледате имоти, кое ви затруднява най-много?">
                        {[
                            ["area_differences", "Разликите между кварталите"],
                            ["pricing", "Това какво е реално добра цена"],
                            ["condition", "Състоянието на имота и рискът от ремонт"],
                            ["documents", "Документите и законността"],
                            ["comparison", "Кое от няколко предложения е най-смислено"],
                            ["not_there_yet", "Още не съм стигнал до това"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={propertyDifficulty === value}
                                onClick={() => setPropertyDifficulty(value)}
                                label={label}
                            />
                        ))}
                        <input
                            type="hidden"
                            name="property_difficulty"
                            value={propertyDifficulty}
                        />
                    </QuestionGroup>

                    {propertyKnown ? (
                        <TextField
                            label="7. Ако имате конкретен имот или shortlist, дайте линк към основната обява"
                            name="listing_url"
                            value={listingUrl}
                            onChange={setListingUrl}
                            placeholder="https://..."
                        />
                    ) : null}

                    <QuestionGroup title="8. Колко подредено е финансирането ви в момента?">
                        {[
                            ["fully_clear", "Напълно изчистено"],
                            ["partly_clear", "Частично изчистено"],
                            ["idea_only", "Имам идея, но не и сигурност"],
                            ["main_problem", "Това е основният ми проблем"],
                            ["not_applicable", "Не важи за мен"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={financingClarity === value}
                                onClick={() => setFinancingClarity(value)}
                                label={label}
                            />
                        ))}
                        <input
                            type="hidden"
                            name="financing_clarity"
                            value={financingClarity}
                        />
                    </QuestionGroup>

                    {isCredit ? (
                        <>
                            <QuestionGroup title="9. Ако ще има кредит, докъде сте стигнали?">
                                {[
                                    ["bank_conversation", "Имам реален разговор с банка"],
                                    ["initial_clarity", "Имам предварителна яснота / ориентир"],
                                    ["researching", "Само проучвам"],
                                    ["not_there_yet", "Още не съм стигнал дотам"],
                                ].map(([value, label]) => (
                                    <OptionButton
                                        key={value}
                                        active={creditProgress === value}
                                        onClick={() => setCreditProgress(value)}
                                        label={label}
                                    />
                                ))}
                                <input type="hidden" name="credit_progress" value={creditProgress} />
                            </QuestionGroup>

                            <QuestionGroup title="10. Имате ли вече източник за самоучастие или обезпечение, ако се наложи?">
                                {[
                                    ["yes", "Да"],
                                    ["partial", "Частично"],
                                    ["not_sure", "Не съм сигурен"],
                                    ["no", "Не"],
                                ].map(([value, label]) => (
                                    <OptionButton
                                        key={value}
                                        active={equitySource === value}
                                        onClick={() => setEquitySource(value)}
                                        label={label}
                                    />
                                ))}
                                <input type="hidden" name="equity_source" value={equitySource} />
                            </QuestionGroup>

                            <QuestionGroup title="11. Имате ли вече кредитен консултант или банков контакт, на когото разчитате?">
                                {[
                                    ["yes", "Да"],
                                    ["no_but_looking", "Не, но търся"],
                                    ["no_not_thought", "Не и още не съм мислил по това"],
                                    ["not_sure_needed", "Не съм сигурен, че ми трябва"],
                                ].map(([value, label]) => (
                                    <OptionButton
                                        key={value}
                                        active={hasCreditAdvisor === value}
                                        onClick={() => setHasCreditAdvisor(value)}
                                        label={label}
                                    />
                                ))}
                                <input
                                    type="hidden"
                                    name="has_credit_advisor"
                                    value={hasCreditAdvisor}
                                />
                            </QuestionGroup>
                        </>
                    ) : (
                        <QuestionGroup title="9. Ако няма да разчитате основно на кредит, колко сигурен е бюджетът ви реално?">
                            {[
                                ["fully_secure", "Напълно сигурен е"],
                                ["mostly_secure", "Почти сигурен е"],
                                ["partly_pending", "Част от средствата още не са окончателно осигурени"],
                                ["still_estimate", "Все още е по-скоро ориентировъчен"],
                            ].map(([value, label]) => (
                                <OptionButton
                                    key={value}
                                    active={cashCertainty === value}
                                    onClick={() => setCashCertainty(value)}
                                    label={label}
                                />
                            ))}
                            <input type="hidden" name="cash_certainty" value={cashCertainty} />
                        </QuestionGroup>
                    )}

                    <QuestionGroup title="10. Какъв тип имот ви изглежда най-близо до вашия случай?">
                        {[
                            ["apartment", "Апартамент"],
                            ["small_unit", "Студио / по-малък имот"],
                            ["house", "Къща"],
                            ["dont_know", "Още не знам"],
                            ["depends", "Зависи какво излезе като смислена възможност"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={propertyType === value}
                                onClick={() => setPropertyType(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="property_type" value={propertyType} />
                    </QuestionGroup>

                    <QuestionGroup title="11. Колко компромис сте готови да приемете с ремонта?">
                        {[
                            ["ready", "Искам нещо готово или почти готово"],
                            ["moderate", "Допустим е умерен ремонт"],
                            ["heavy_if_worth_it", "Допустим е по-сериозен ремонт, ако цената го оправдава"],
                            ["not_sure", "Не съм сигурен какво е разумно"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={renovationTolerance === value}
                                onClick={() => setRenovationTolerance(value)}
                                label={label}
                            />
                        ))}
                        <input
                            type="hidden"
                            name="renovation_tolerance"
                            value={renovationTolerance}
                        />
                    </QuestionGroup>

                    {isIncomeDriven ? (
                        <QuestionGroup title="12. Колко важно е имотът да носи доход или поне частично да покрива разходите си?">
                            {[
                                ["very_important", "Много важно"],
                                ["important", "По-скоро важно"],
                                ["nice_to_have", "Добре е, но не е решаващо"],
                                ["not_leading", "Не е водещият критерий"],
                            ].map(([value, label]) => (
                                <OptionButton
                                    key={value}
                                    active={incomeImportance === value}
                                    onClick={() => setIncomeImportance(value)}
                                    label={label}
                                />
                            ))}
                            <input
                                type="hidden"
                                name="income_importance"
                                value={incomeImportance}
                            />
                        </QuestionGroup>
                    ) : null}

                    {isCredit && isIncomeDriven ? (
                        <QuestionGroup title="13. Колко важно е за вас имотът поне частично да покрива месечната вноска по кредита?">
                            {[
                                ["very_important", "Много важно"],
                                ["desirable", "Желателно е"],
                                ["good_not_required", "Добре е, но не е задължително"],
                                ["not_leading", "Не е водещо"],
                            ].map(([value, label]) => (
                                <OptionButton
                                    key={value}
                                    active={creditCoverageImportance === value}
                                    onClick={() => setCreditCoverageImportance(value)}
                                    label={label}
                                />
                            ))}
                            <input
                                type="hidden"
                                name="credit_coverage_importance"
                                value={creditCoverageImportance}
                            />
                        </QuestionGroup>
                    ) : null}

                    <QuestionGroup title="14. Кой от тези резултати би ви накарал да кажете, че покупката е имала смисъл?">
                        {[
                            ["clear_target", "Намерил съм имот, който реално отговаря на целта ми"],
                            ["avoid_bad_deal", "Избегнал съм лоша сделка, дори това да значи да не купя веднага"],
                            ["know_what_to_seek", "Имам яснота какво да търся и какво да избягвам"],
                            ["calm_process", "Успял съм да мина през процеса спокойно и без неприятни изненади"],
                            ["good_financial_logic", "Имотът е добър както за мен, така и като финансова логика"],
                            ["cant_formulate", "Още не мога да го формулирам добре"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={successOutcome === value}
                                onClick={() => setSuccessOutcome(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="success_outcome" value={successOutcome} />
                    </QuestionGroup>

                    <QuestionGroup title="15. Кое от следните ви липсва най-много в момента, за да продължите уверено?">
                        {[
                            ["clear_direction", "Ясна посока какво точно да търся"],
                            ["realistic_financing", "Увереност, че бюджетът и финансирането ми са реалистични"],
                            ["second_opinion", "Второ мнение дали конкретен имот наистина си струва"],
                            ["guided_process", "Някой да подреди процеса и следващите стъпки"],
                            ["better_risk_view", "По-добро разбиране на рисковете, преди да се обвържа"],
                            ["everything", "Всичко по малко"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={missingPiece === value}
                                onClick={() => setMissingPiece(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="missing_piece" value={missingPiece} />
                    </QuestionGroup>

                    <QuestionGroup title="16. Кое от следните е най-близо до начина, по който искате да продължите?">
                        {[
                            ["foundation", "Искам първо да изчистя рамката, преди да се вкопча в конкретен имот"],
                            ["evaluation", "Искам някой да прецени дали конкретен имот си струва"],
                            ["guidance", "Искам guidance през самата сделка и следващите стъпки"],
                            ["not_sure", "Още не съм сигурен кой тип помощ ми е нужен"],
                        ].map(([value, label]) => (
                            <OptionButton
                                key={value}
                                active={helpType === value}
                                onClick={() => setHelpType(value)}
                                label={label}
                            />
                        ))}
                        <input type="hidden" name="help_type" value={helpType} />
                    </QuestionGroup>

                    <TextAreaField
                        label="17. Има ли нещо важно, което според вас трябва да знаем за случая ви?"
                        name="additional_context"
                        value={additionalContext}
                        onChange={setAdditionalContext}
                        placeholder="Optional"
                    />

                    <div className="flex flex-wrap gap-4 pt-2">
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                        >
                            Submit Serious Screening
                        </button>
                    </div>
                </form>
            </ScreeningCardShell>
        </div>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                {label}
            </div>
            <div className="mt-1 text-sm text-white/80">{value}</div>
        </div>
    );
}

function QuestionGroup({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3">
            <h2 className="text-sm font-medium leading-6 text-white md:text-[15px]">
                {title}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">{children}</div>
        </section>
    );
}

function OptionButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition",
                active
                    ? "border-stone/40 bg-stone/[0.12] text-white"
                    : "border-white/10 bg-black/10 text-white/72 hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

function TextField({
    label,
    name,
    value,
    onChange,
    placeholder,
    required,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="block space-y-3">
            <span className="text-sm font-medium leading-6 text-white md:text-[15px]">
                {label}
            </span>
            <input
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-stone/40"
            />
        </label>
    );
}

function TextAreaField({
    label,
    name,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block space-y-3">
            <span className="text-sm font-medium leading-6 text-white md:text-[15px]">
                {label}
            </span>
            <textarea
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-stone/40"
            />
        </label>
    );
}