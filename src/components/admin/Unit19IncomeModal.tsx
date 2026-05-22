"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
    createIncomeMonths,
    unit19IncomeSeed,
    unit19MonthLabels,
    unit19UtilityLabels,
    type Unit19IncomeMonth,
    type Unit19IncomeSettings,
    type Unit19IncomeState,
    type Unit19OwnerExpense,
    type Unit19UtilityKey,
} from "@/lib/admin/unit19IncomeData";

type Props = {
    open: boolean;
    onClose: () => void;
};

type ExpenseDraft = {
    month: number;
    title: string;
    amountEur: number;
};

const STORAGE_KEY = "epitropos.unit19.income.v1";
const utilityOrder: Unit19UtilityKey[] = ["electricity", "water", "gas", "building_fees"];

const inputClass = "w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]";

const euroFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

function formatEur(value: number) {
    return euroFormatter.format(value);
}

function todayIso() {
    const value = new Date();
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
    return value.toISOString().slice(0, 10);
}

function parseDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function isTaxDue(settings: Unit19IncomeSettings) {
    if (settings.taxPaid) return false;
    return parseDate(settings.taxDueDate) <= parseDate(todayIso());
}

function loadIncomeState(): Unit19IncomeState {
    if (typeof window === "undefined") return unit19IncomeSeed;

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return unit19IncomeSeed;
        const parsed = JSON.parse(saved) as Unit19IncomeState;
        return parsed?.months?.length === 12 ? parsed : unit19IncomeSeed;
    } catch {
        return unit19IncomeSeed;
    }
}

function IconClose() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function IconIncome() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19h16" />
            <path d="M7 16V9" />
            <path d="M12 16V5" />
            <path d="M17 16v-7" />
            <path d="M6 9l6-5 6 5" />
        </svg>
    );
}

export default function Unit19IncomeModal({ open, onClose }: Props) {
    const [state, setState] = useState<Unit19IncomeState>(() => loadIncomeState());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const stats = useMemo(() => {
        const expectedRent = state.months.reduce((sum, month) => sum + month.expectedRentEur, 0);
        const collectedRent = state.months.reduce((sum, month) => sum + month.paidRentEur, 0);
        const ownerExpenses = state.months.reduce(
            (sum, month) => sum + month.ownerExpenses.reduce((monthSum, expense) => monthSum + expense.amountEur, 0),
            0,
        );
        const unpaidMonths = state.months.filter((month) => month.expectedRentEur > 0 && !month.rentPaid).length;
        const estimatedTax = Math.round((collectedRent * state.settings.taxRatePercent) / 100);

        return {
            expectedRent,
            collectedRent,
            outstanding: Math.max(expectedRent - collectedRent, 0),
            ownerExpenses,
            estimatedTax,
            netAfterOwnerCosts: collectedRent - ownerExpenses - estimatedTax,
            unpaidMonths,
        };
    }, [state]);

    const selected = state.months.find((month) => month.month === selectedMonth) ?? state.months[0];

    function patchSettings(patch: Partial<Unit19IncomeSettings>) {
        setState((current) => ({
            ...current,
            settings: { ...current.settings, ...patch },
        }));
    }

    function patchMonth(monthNumber: number, patch: Partial<Unit19IncomeMonth>) {
        setState((current) => ({
            ...current,
            months: current.months.map((month) => (month.month === monthNumber ? { ...month, ...patch } : month)),
        }));
    }

    function toggleUtility(monthNumber: number, key: Unit19UtilityKey) {
        setState((current) => ({
            ...current,
            months: current.months.map((month) =>
                month.month === monthNumber
                    ? { ...month, utilities: { ...month.utilities, [key]: !month.utilities[key] } }
                    : month,
            ),
        }));
    }

    function applyRentSchedule() {
        setState((current) => ({
            ...current,
            months: current.months.map((month) => ({
                ...month,
                expectedRentEur:
                    month.month >= current.settings.rentStartMonth && month.month <= current.settings.rentEndMonth
                        ? current.settings.monthlyRentEur
                        : 0,
                paidRentEur:
                    month.month >= current.settings.rentStartMonth && month.month <= current.settings.rentEndMonth
                        ? month.paidRentEur
                        : 0,
                rentPaid:
                    month.month >= current.settings.rentStartMonth && month.month <= current.settings.rentEndMonth
                        ? month.rentPaid
                        : false,
            })),
        }));
    }

    function markRentPaid(month: Unit19IncomeMonth) {
        const nextPaid = !month.rentPaid;
        patchMonth(month.month, {
            rentPaid: nextPaid,
            paidRentEur: nextPaid ? month.expectedRentEur : 0,
            paidDate: nextPaid ? month.paidDate || todayIso() : undefined,
        });
    }

    function saveExpense() {
        if (!expenseDraft?.title.trim()) return;

        const expense: Unit19OwnerExpense = {
            id: `expense-${Date.now()}`,
            title: expenseDraft.title.trim(),
            amountEur: Number(expenseDraft.amountEur || 0),
        };

        setState((current) => ({
            ...current,
            months: current.months.map((month) =>
                month.month === expenseDraft.month
                    ? { ...month, ownerExpenses: [...month.ownerExpenses, expense] }
                    : month,
            ),
        }));
        setExpenseDraft(null);
    }

    function deleteExpense(monthNumber: number, expenseId: string) {
        setState((current) => ({
            ...current,
            months: current.months.map((month) =>
                month.month === monthNumber
                    ? { ...month, ownerExpenses: month.ownerExpenses.filter((expense) => expense.id !== expenseId) }
                    : month,
            ),
        }));
    }

    function resetSeed() {
        setState(unit19IncomeSeed);
        setSelectedMonth(new Date().getMonth() + 1);
        setExpenseDraft(null);
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] overflow-hidden px-3 py-3 sm:px-5">
            <button
                type="button"
                aria-label="Close income modal"
                className="fixed inset-0 cursor-default bg-[#06101d]/[0.52] backdrop-blur-[10px]"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-white/[0.72] bg-white/[0.74] shadow-[0_30px_120px_rgba(6,16,29,0.38),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(32,167,107,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(166,139,74,0.15),transparent_24%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.62] to-transparent" />

                <div className="relative shrink-0 border-b border-white/[0.72] px-5 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#0f7448]">
                                <IconIncome />
                                Income cockpit
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                Unit 19 Rental Income
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={applyRentSchedule}
                                className="rounded-[13px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-4 py-2.5 text-[12px] font-semibold text-[#0f7448] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#20a76b]/[0.13] active:scale-[0.96]"
                            >
                                Apply rent schedule
                            </button>
                            <button
                                type="button"
                                onClick={resetSeed}
                                className="rounded-[13px] border border-white/[0.78] bg-white/[0.52] px-4 py-2.5 text-[12px] font-semibold text-[#6f849d] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.78] bg-white/[0.62] text-[#6f849d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                            >
                                <IconClose />
                            </button>
                        </div>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        <StatCard label="Expected rent" value={formatEur(stats.expectedRent)} detail={`${state.settings.year} schedule`} />
                        <StatCard label="Collected" value={formatEur(stats.collectedRent)} detail="paid rent" tone="ok" />
                        <StatCard label="Outstanding" value={formatEur(stats.outstanding)} detail={`${stats.unpaidMonths} unpaid months`} tone={stats.outstanding > 0 ? "warn" : "ok"} />
                        <StatCard label="Owner expenses" value={formatEur(stats.ownerExpenses)} detail="not tenant utilities" tone="base" />
                        <StatCard label="Net estimate" value={formatEur(stats.netAfterOwnerCosts)} detail="after tax reserve" tone={stats.netAfterOwnerCosts >= 0 ? "ok" : "warn"} />
                    </div>
                </div>

                <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[258px_minmax(0,1fr)_330px]">
                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.42] p-3.5 lg:border-b-0 lg:border-r">
                        <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Rent setup</div>
                            <div className="space-y-2">
                                <Field label="Year">
                                    <input
                                        type="number"
                                        value={state.settings.year}
                                        onChange={(event) => {
                                            const year = Number(event.target.value || state.settings.year);
                                            setState((current) => ({ ...current, settings: { ...current.settings, year } }));
                                        }}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Monthly rent">
                                    <input
                                        type="number"
                                        value={state.settings.monthlyRentEur}
                                        onChange={(event) => patchSettings({ monthlyRentEur: Number(event.target.value || 0) })}
                                        className={inputClass}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="From">
                                        <MonthSelect value={state.settings.rentStartMonth} onChange={(month) => patchSettings({ rentStartMonth: month })} />
                                    </Field>
                                    <Field label="To">
                                        <MonthSelect value={state.settings.rentEndMonth} onChange={(month) => patchSettings({ rentEndMonth: month })} />
                                    </Field>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Tax reserve</div>
                            <div className="space-y-2">
                                <Field label="Rate %">
                                    <input
                                        type="number"
                                        value={state.settings.taxRatePercent}
                                        onChange={(event) => patchSettings({ taxRatePercent: Number(event.target.value || 0) })}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Due date">
                                    <AdminDatePicker value={state.settings.taxDueDate} onChange={(date) => patchSettings({ taxDueDate: date })} />
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => patchSettings({ taxPaid: !state.settings.taxPaid })}
                                    className={[
                                        "w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
                                        state.settings.taxPaid
                                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                                            : isTaxDue(state.settings)
                                                ? "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]"
                                                : "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]",
                                    ].join(" ")}
                                >
                                    {state.settings.taxPaid ? "Tax marked paid" : isTaxDue(state.settings) ? "Tax due / unpaid" : "Tax pending"}
                                </button>
                                <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2 text-[11px] leading-4 text-[#607993]">
                                    Estimate: <span className="font-semibold text-[#0b1623]">{formatEur(stats.estimatedTax)}</span>. Editable reserve only; verify with accountant before payment.
                                </div>
                            </div>
                        </div>
                    </aside>

                    <main className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
                        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {state.months.map((month) => {
                                const selected = selectedMonth === month.month;
                                const expected = month.expectedRentEur > 0;
                                const ownerExpenses = month.ownerExpenses.reduce((sum, expense) => sum + expense.amountEur, 0);
                                const utilityCount = utilityOrder.filter((key) => month.utilities[key]).length;

                                return (
                                    <button
                                        key={month.month}
                                        type="button"
                                        onClick={() => setSelectedMonth(month.month)}
                                        className={[
                                            "min-h-[170px] rounded-[18px] border p-3 text-left shadow-[0_10px_28px_rgba(41,73,112,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.74] active:scale-[0.99]",
                                            selected ? "border-[#2f80ed]/[0.34] bg-[#2f80ed]/[0.07]" : "border-white/[0.78] bg-white/[0.58]",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[#0b1623]">{unit19MonthLabels[month.month - 1]}</div>
                                                <div className="mt-0.5 text-[10.5px] text-[#7a90a8]">{state.settings.year}</div>
                                            </div>
                                            <span
                                                className={[
                                                    "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]",
                                                    !expected
                                                        ? "border-[#9ab0c4]/[0.24] bg-[#9ab0c4]/[0.08] text-[#607993]"
                                                        : month.rentPaid
                                                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]"
                                                            : "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]",
                                                ].join(" ")}
                                            >
                                                {!expected ? "No rent" : month.rentPaid ? "Paid" : "Unpaid"}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                                                <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">Expected</div>
                                                <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{formatEur(month.expectedRentEur)}</div>
                                            </div>
                                            <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                                                <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">Paid</div>
                                                <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{formatEur(month.paidRentEur)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <span className="rounded-full border border-[#ccd9e8] bg-white/[0.52] px-2 py-0.5 text-[10px] text-[#607993]">Utilities {utilityCount}/4</span>
                                            {ownerExpenses > 0 ? (
                                                <span className="rounded-full border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2 py-0.5 text-[10px] text-[#8c5947]">Owner costs {formatEur(ownerExpenses)}</span>
                                            ) : null}
                                        </div>

                                        {month.note ? <div className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#7a90a8]">{month.note}</div> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </main>

                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-white/[0.65] bg-white/[0.36] p-3.5 lg:border-l lg:border-t-0">
                        <MonthDetails
                            month={selected}
                            onTogglePaid={markRentPaid}
                            onPatch={patchMonth}
                            onToggleUtility={toggleUtility}
                            onAddExpense={() => setExpenseDraft({ month: selected.month, title: "", amountEur: 0 })}
                            onDeleteExpense={deleteExpense}
                        />
                    </aside>
                </div>

                {expenseDraft ? (
                    <ExpenseEditor
                        draft={expenseDraft}
                        onChange={setExpenseDraft}
                        onSave={saveExpense}
                        onCancel={() => setExpenseDraft(null)}
                    />
                ) : null}
            </div>
        </div>
    );
}

function StatCard({ label, value, detail, tone = "base" }: { label: string; value: string; detail: string; tone?: "base" | "ok" | "warn" }) {
    const toneClass =
        tone === "ok"
            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
            : tone === "warn"
                ? "border-[#d96969]/[0.24] bg-[#d96969]/[0.08] text-[#9d2f2f]"
                : "border-white/[0.80] bg-white/[0.62] text-[#7a90a8]";

    return (
        <div className={["rounded-[16px] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]", toneClass].join(" ")}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em]">{label}</div>
            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{value}</div>
            <div className="mt-1 text-[10px]">{detail}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">{label}</span>
            {children}
        </label>
    );
}

function MonthSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    return (
        <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={inputClass}>
            {unit19MonthLabels.map((label, index) => (
                <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                </option>
            ))}
        </select>
    );
}

function MonthDetails({
    month,
    onTogglePaid,
    onPatch,
    onToggleUtility,
    onAddExpense,
    onDeleteExpense,
}: {
    month: Unit19IncomeMonth;
    onTogglePaid: (month: Unit19IncomeMonth) => void;
    onPatch: (month: number, patch: Partial<Unit19IncomeMonth>) => void;
    onToggleUtility: (month: number, key: Unit19UtilityKey) => void;
    onAddExpense: () => void;
    onDeleteExpense: (month: number, expenseId: string) => void;
}) {
    return (
        <div className="space-y-2.5">
            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Selected month</div>
                <div className="text-[17px] font-semibold text-[#0b1623]">{unit19MonthLabels[month.month - 1]}</div>
                <div className="mt-1 text-[11px] text-[#7a90a8]">Rent and operational checks</div>

                <button
                    type="button"
                    onClick={() => onTogglePaid(month)}
                    disabled={month.expectedRentEur <= 0}
                    className={[
                        "mt-3 w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                        month.rentPaid
                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                            : "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]",
                    ].join(" ")}
                >
                    {month.rentPaid ? "Rent paid" : "Mark rent paid"}
                </button>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Rent details</div>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Expected">
                        <input
                            type="number"
                            value={month.expectedRentEur}
                            onChange={(event) => onPatch(month.month, { expectedRentEur: Number(event.target.value || 0) })}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Paid">
                        <input
                            type="number"
                            value={month.paidRentEur}
                            onChange={(event) => onPatch(month.month, { paidRentEur: Number(event.target.value || 0), rentPaid: Number(event.target.value || 0) >= month.expectedRentEur && month.expectedRentEur > 0 })}
                            className={inputClass}
                        />
                    </Field>
                </div>
                <div className="mt-2">
                    <Field label="Paid date">
                        <AdminDatePicker value={month.paidDate ?? todayIso()} onChange={(date) => onPatch(month.month, { paidDate: date })} />
                    </Field>
                </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Utilities status</div>
                <div className="grid grid-cols-2 gap-1.5">
                    {utilityOrder.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onToggleUtility(month.month, key)}
                            className={[
                                "rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
                                month.utilities[key]
                                    ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                                    : "border-[#ccd9e8] bg-white/[0.56] text-[#607993]",
                            ].join(" ")}
                        >
                            {month.utilities[key] ? "✓ " : "○ "}{unit19UtilityLabels[key]}
                        </button>
                    ))}
                </div>
                <div className="mt-2 text-[10.5px] leading-4 text-[#7a90a8]">Utilities are tracked as control checks only. They are not counted as owner expenses.</div>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Owner expenses</div>
                    <button type="button" onClick={onAddExpense} className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-2 py-1 text-[10.5px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88]">
                        Add
                    </button>
                </div>
                <div className="space-y-1.5">
                    {month.ownerExpenses.length === 0 ? (
                        <div className="text-[12px] text-[#7a90a8]">No owner expenses this month.</div>
                    ) : (
                        month.ownerExpenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2">
                                <div className="min-w-0">
                                    <div className="truncate text-[12px] font-semibold text-[#0b1623]">{expense.title}</div>
                                    <div className="text-[10.5px] text-[#7a90a8]">{formatEur(expense.amountEur)}</div>
                                </div>
                                <button type="button" onClick={() => onDeleteExpense(month.month, expense.id)} className="text-[10.5px] font-semibold text-[#9d2f2f]">
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <Field label="Note">
                    <textarea
                        value={month.note ?? ""}
                        onChange={(event) => onPatch(month.month, { note: event.target.value })}
                        rows={3}
                        className={`${inputClass} min-h-[76px] resize-none`}
                    />
                </Field>
            </div>
        </div>
    );
}

function ExpenseEditor({ draft, onChange, onSave, onCancel }: { draft: ExpenseDraft; onChange: (draft: ExpenseDraft) => void; onSave: () => void; onCancel: () => void }) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06101d]/[0.18] p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[460px] rounded-[24px] border border-white/[0.78] bg-white/[0.90] p-4 shadow-[0_24px_90px_rgba(6,16,29,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">Owner expense</div>
                        <div className="mt-1 text-[20px] font-semibold text-[#0b1623]">Add expense</div>
                    </div>
                    <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#ccd9e8] bg-white/[0.62] text-[#607993] transition hover:bg-white">
                        <IconClose />
                    </button>
                </div>

                <div className="space-y-2.5">
                    <Field label="Title">
                        <input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} className={inputClass} autoFocus />
                    </Field>
                    <Field label="Amount EUR">
                        <input type="number" value={draft.amountEur} onChange={(event) => onChange({ ...draft, amountEur: Number(event.target.value || 0) })} className={inputClass} />
                    </Field>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] px-3 py-2 text-[12px] font-semibold text-[#607993] transition hover:bg-white">
                        Cancel
                    </button>
                    <button type="button" onClick={onSave} className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-2 text-[12px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">
                        Save expense
                    </button>
                </div>
            </div>
        </div>
    );
}
