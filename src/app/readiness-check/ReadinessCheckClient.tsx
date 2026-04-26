"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProgressSteps from "@/components/intake/ProgressSteps";
import ScreeningCardShell from "@/components/intake/ScreeningCardShell";
import {
  READINESS_BUDGET_OPTIONS,
  READINESS_FINANCING_OPTIONS,
  READINESS_IDENTIFIED_OPTIONS,
  READINESS_SERIOUSNESS_OPTIONS,
  READINESS_STAGE_OPTIONS,
  READINESS_USE_OPTIONS,
  READINESS_WHY_OPTIONS,
  READINESS_WORRY_OPTIONS,
  type BudgetBandValue,
  type FinancingValue,
  type IdentifiedPropertyValue,
  type MainWorryValue,
  type PropertyUseValue,
  type ReadinessAnswers,
  type SeriousnessValue,
  type StageValue,
  type WhyGreeceValue,
  buildSeriousScreeningPath,
  getReadinessResult,
} from "@/lib/intake/readiness";

type Props = {
    isLoggedIn: boolean;
};

const initialAnswers: ReadinessAnswers = {
    whyGreece: "better_life",
    stage: "exploring",
    propertyUse: "personal",
    budgetBand: "up_to_80k",
    financing: "have_funds",
    identifiedProperty: "searching",
    seriousness: "just_browsing",
    mainWorry: "everything",
};

export default function ReadinessCheckClient({ isLoggedIn }: Props) {
    const [answers, setAnswers] = useState<ReadinessAnswers>(initialAnswers);
    const [showResult, setShowResult] = useState(false);

    const result = useMemo(() => getReadinessResult(answers), [answers]);
    const seriousPath = useMemo(() => buildSeriousScreeningPath(answers), [answers]);
    const continueHref = isLoggedIn
        ? seriousPath
        : `/auth/login?redirect=${encodeURIComponent(seriousPath)}`;

    function setField<K extends keyof ReadinessAnswers>(
        key: K,
        value: ReadinessAnswers[K],
    ) {
        setAnswers((current) => ({
            ...current,
            [key]: value,
        }));
    }

    if (showResult) {
        return (
            <div className="space-y-6">
                <ProgressSteps
                    steps={["Readiness Check", "Result", "Continue"]}
                    current={1}
                />

                <ScreeningCardShell
                    eyebrow="Readiness result"
                    title={result.statusTitle}
                    description="Това не е окончателно решение. Това е първа смислена ориентация дали има реален сигнал за следваща стъпка."
                >
                    <div className="space-y-5">
                        <div className="rounded-[24px] border border-white/10 bg-black/10 p-5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                                Active insight
                            </div>
                            <p className="mt-3 text-sm leading-7 text-white/78">
                                {result.insight}
                            </p>
                        </div>

                        <div className="rounded-[24px] border border-stone/20 bg-stone/[0.08] p-5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-stone/85">
                                Next step
                            </div>
                            <p className="mt-3 text-sm leading-7 text-white/82">
                                {result.nextStep}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link
                                href={continueHref}
                                className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                            >
                                {isLoggedIn ? "Continue to Serious Screening" : "Save result and continue"}
                            </Link>

                            <button
                                type="button"
                                onClick={() => setShowResult(false)}
                                className="inline-flex items-center rounded-md border border-white/15 px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-white/75 transition hover:bg-white/5 hover:text-white"
                            >
                                Back to answers
                            </button>
                        </div>

                        {!isLoggedIn ? (
                            <p className="text-xs leading-6 text-white/52">
                                Ако продължите без да влезете в профила си, резултатът няма да се
                                запази.
                            </p>
                        ) : null}
                    </div>
                </ScreeningCardShell>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ProgressSteps
                steps={["Readiness Check", "Result", "Continue"]}
                current={0}
            />

            <ScreeningCardShell
                eyebrow="Readiness Check"
                title="Имате ли път към Гърция?"
                description="Отнема около 2 минути. Накрая ще получите кратка насока къде се намирате и коя е най-важната следваща стъпка."
            >
                <div className="space-y-8">
                    <QuestionGroup title="1. Кое най-добре описва защо да е имот в Гърция?">
                        {READINESS_WHY_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.whyGreece === option.value}
                                onClick={() => setField("whyGreece", option.value as WhyGreeceValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="2. До къде сте в момента?">
                        {READINESS_STAGE_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.stage === option.value}
                                onClick={() => setField("stage", option.value as StageValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="3. Имотът ще е по-скоро:">
                        {READINESS_USE_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.propertyUse === option.value}
                                onClick={() => setField("propertyUse", option.value as PropertyUseValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="4. Какъв е горе-долу предвиденият бюджет?">
                        {READINESS_BUDGET_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.budgetBand === option.value}
                                onClick={() => setField("budgetBand", option.value as BudgetBandValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="5. Как мислите да финансирате покупката?">
                        {READINESS_FINANCING_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.financing === option.value}
                                onClick={() => setField("financing", option.value as FinancingValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="6. Имате ли вече предвид конкретен имот?">
                        {READINESS_IDENTIFIED_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.identifiedProperty === option.value}
                                onClick={() =>
                                    setField("identifiedProperty", option.value as IdentifiedPropertyValue)
                                }
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="7. Колко сериозно е намерението ви в момента?">
                        {READINESS_SERIOUSNESS_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.seriousness === option.value}
                                onClick={() =>
                                    setField("seriousness", option.value as SeriousnessValue)
                                }
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <QuestionGroup title="8. Кое ви притеснява най-много?">
                        {READINESS_WORRY_OPTIONS.map((option) => (
                            <OptionButton
                                key={option.value}
                                active={answers.mainWorry === option.value}
                                onClick={() => setField("mainWorry", option.value as MainWorryValue)}
                                label={option.label}
                            />
                        ))}
                    </QuestionGroup>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowResult(true)}
                            className="inline-flex items-center rounded-md bg-stone px-6 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                        >
                            See my result
                        </button>
                    </div>
                </div>
            </ScreeningCardShell>
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