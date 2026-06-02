"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Unit19ModalSwitcher, { type Unit19PanelKey } from "@/components/admin/Unit19ModalSwitcher";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
    createManagedPropertyIncomeOwnerExpense,
    deleteManagedPropertyIncomeOwnerExpense,
    getManagedPropertyBySlug,
    getManagedPropertyIncome,
    updateManagedPropertyIncomeMonth,
    updateManagedPropertyIncomeMonths,
    updateManagedPropertyTaxReserve,
    type ManagedPropertyIncomeMonth,
    type ManagedPropertyIncomeMonthPatch,
    type ManagedPropertyIncomeOwnerExpense,
    type ManagedPropertyTaxReserve,
} from "@/lib/admin/managedPropertiesApi";

type Props = {
    open: boolean;
    onClose: () => void;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
};

type ExpenseDraft = {
    monthId: string;
    title: string;
    amountEur: number;
};

type UtilityKey = "electricity_confirmed" | "water_confirmed" | "gas_confirmed" | "building_fees_confirmed";

const PROPERTY_SLUG = "unit-19";
const DEFAULT_YEAR = 2026;
const utilityOrder: UtilityKey[] = ["electricity_confirmed", "water_confirmed", "gas_confirmed", "building_fees_confirmed"];

const utilityLabels: Record<UtilityKey, string> = {
    electricity_confirmed: "Electricity",
    water_confirmed: "Water",
    gas_confirmed: "Gas",
    building_fees_confirmed: "Building fees",
};

const monthLabels = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const inputClass = "w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]";

const euroFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

function formatEur(value: number) {
    return euroFormatter.format(Number.isFinite(value) ? value : 0);
}

function todayIso() {
    const value = new Date();
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
    return value.toISOString().slice(0, 10);
}

function parseDate(value: string | null | undefined) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function isTaxDue(taxReserve: ManagedPropertyTaxReserve | null) {
    if (!taxReserve || taxReserve.paid) return false;
    const due = parseDate(taxReserve.due_date);
    if (!due) return false;
    return due <= (parseDate(todayIso()) ?? new Date());
}

function deriveRentStatus(expected: number, paid: number) {
    if (expected <= 0) return "no_rent" as const;
    if (paid <= 0) return "unpaid" as const;
    if (paid < expected) return "partial" as const;
    return "paid" as const;
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

export default function Unit19IncomeModal({ open, onClose, onSwitchPanel }: Props) {
    const [managedPropertyId, setManagedPropertyId] = useState<string | null>(null);
    const [year, setYear] = useState(DEFAULT_YEAR);
    const [months, setMonths] = useState<ManagedPropertyIncomeMonth[]>([]);
    const [ownerExpenses, setOwnerExpenses] = useState<ManagedPropertyIncomeOwnerExpense[]>([]);
    const [taxReserve, setTaxReserve] = useState<ManagedPropertyTaxReserve | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
    const [monthlyRentEur, setMonthlyRentEur] = useState(450);
    const [rentStartMonth, setRentStartMonth] = useState(5);
    const [rentEndMonth, setRentEndMonth] = useState(9);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadIncome(targetYear = year) {
        try {
            setLoading(true);
            setError(null);

            const property = await getManagedPropertyBySlug(PROPERTY_SLUG);
            const result = await getManagedPropertyIncome(property.id, targetYear);

            setManagedPropertyId(property.id);
            setMonths(result.months);
            setOwnerExpenses(result.ownerExpenses);
            setTaxReserve(result.taxReserve);

            const activeMonths = result.months.filter((month) => month.rent_expected_eur > 0);
            if (activeMonths.length > 0) {
                setMonthlyRentEur(activeMonths[0].rent_expected_eur);
                setRentStartMonth(Math.min(...activeMonths.map((month) => month.month)));
                setRentEndMonth(Math.max(...activeMonths.map((month) => month.month)));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load income data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
        void loadIncome(year);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    const selected = months.find((month) => month.month === selectedMonth) ?? months[0];

    const expensesByMonthId = useMemo(() => {
        const map = new Map<string, ManagedPropertyIncomeOwnerExpense[]>();
        for (const expense of ownerExpenses) {
            if (!expense.income_month_id) continue;
            map.set(expense.income_month_id, [...(map.get(expense.income_month_id) ?? []), expense]);
        }
        return map;
    }, [ownerExpenses]);

    const stats = useMemo(() => {
        const expectedRent = months.reduce((sum, month) => sum + month.rent_expected_eur, 0);
        const collectedRent = months.reduce((sum, month) => sum + month.rent_paid_eur, 0);
        const ownerCostTotal = ownerExpenses.reduce((sum, expense) => sum + expense.amount_eur, 0);
        const unpaidMonths = months.filter((month) => month.rent_expected_eur > 0 && month.rent_status !== "paid").length;
        const taxRate = taxReserve?.tax_rate_percent ?? 15;
        const estimatedTax = Math.round((collectedRent * taxRate) / 100);

        return {
            expectedRent,
            collectedRent,
            outstanding: Math.max(expectedRent - collectedRent, 0),
            ownerExpenses: ownerCostTotal,
            estimatedTax,
            netAfterOwnerCosts: collectedRent - ownerCostTotal - estimatedTax,
            unpaidMonths,
        };
    }, [months, ownerExpenses, taxReserve]);

    async function patchMonth(month: ManagedPropertyIncomeMonth, patch: ManagedPropertyIncomeMonthPatch) {
        try {
            setSaving(true);
            setError(null);

            const updated = await updateManagedPropertyIncomeMonth(month.id, patch);
            setMonths((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save month");
        } finally {
            setSaving(false);
        }
    }

    async function toggleUtility(month: ManagedPropertyIncomeMonth, key: UtilityKey) {
        await patchMonth(month, { [key]: !month[key] } as ManagedPropertyIncomeMonthPatch);
    }

    async function applyRentSchedule() {
        try {
            setSaving(true);
            setError(null);

            const patches = months.map((month) => {
                const expected = month.month >= rentStartMonth && month.month <= rentEndMonth ? monthlyRentEur : 0;
                const paid = expected > 0 ? month.rent_paid_eur : 0;
                return {
                    id: month.id,
                    patch: {
                        rent_expected_eur: expected,
                        rent_paid_eur: paid,
                        rent_status: deriveRentStatus(expected, paid),
                    },
                };
            });

            const updated = await updateManagedPropertyIncomeMonths(patches);
            setMonths((current) => current.map((month) => updated.find((item) => item.id === month.id) ?? month));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to apply rent schedule");
        } finally {
            setSaving(false);
        }
    }

    async function markRentPaid(month: ManagedPropertyIncomeMonth) {
        const nextPaid = month.rent_status !== "paid";
        const nextPaidAmount = nextPaid ? month.rent_expected_eur : 0;

        await patchMonth(month, {
            rent_paid_eur: nextPaidAmount,
            rent_paid_date: nextPaid ? month.rent_paid_date || todayIso() : null,
            rent_status: deriveRentStatus(month.rent_expected_eur, nextPaidAmount),
        });
    }

    async function saveExpense() {
        if (!expenseDraft?.title.trim() || !managedPropertyId) return;

        try {
            setSaving(true);
            setError(null);

            const created = await createManagedPropertyIncomeOwnerExpense({
                managed_property_id: managedPropertyId,
                income_month_id: expenseDraft.monthId,
                title: expenseDraft.title.trim(),
                amount_eur: Number(expenseDraft.amountEur || 0),
                expense_date: todayIso(),
                note: null,
            });

            setOwnerExpenses((current) => [created, ...current]);
            setExpenseDraft(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save owner expense");
        } finally {
            setSaving(false);
        }
    }

    async function deleteExpense(id: string) {
        try {
            setSaving(true);
            setError(null);
            await deleteManagedPropertyIncomeOwnerExpense(id);
            setOwnerExpenses((current) => current.filter((expense) => expense.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete owner expense");
        } finally {
            setSaving(false);
        }
    }

    async function patchTaxReserve(patch: Partial<ManagedPropertyTaxReserve>) {
        if (!taxReserve) return;

        try {
            setSaving(true);
            setError(null);

            const updated = await updateManagedPropertyTaxReserve(taxReserve.id, patch);
            setTaxReserve(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save tax reserve");
        } finally {
            setSaving(false);
        }
    }

    async function changeYear(nextYear: number) {
        setYear(nextYear);
        await loadIncome(nextYear);
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
                                Income cockpit · DB live
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                Unit 19 Rental Income
                            </h2>
                            {error ? <p className="mt-1 text-[12px] font-semibold text-[#9d2f2f]">{error}</p> : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Unit19ModalSwitcher activePanel="income" onSwitchPanel={onSwitchPanel} />
                            <button
                                type="button"
                                onClick={applyRentSchedule}
                                disabled={saving || loading || months.length === 0}
                                className="rounded-[13px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-4 py-2.5 text-[12px] font-semibold text-[#0f7448] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#20a76b]/[0.13] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Apply rent schedule"}
                            </button>
                            <button
                                type="button"
                                onClick={() => loadIncome(year)}
                                disabled={loading || saving}
                                className="rounded-[13px] border border-white/[0.78] bg-white/[0.52] px-4 py-2.5 text-[12px] font-semibold text-[#6f849d] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96] disabled:opacity-50"
                            >
                                Reload
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
                        <StatCard label="Expected rent" value={formatEur(stats.expectedRent)} detail={`${year} schedule`} />
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
                                        value={year}
                                        onChange={(event) => void changeYear(Number(event.target.value || DEFAULT_YEAR))}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Monthly rent">
                                    <input
                                        type="number"
                                        value={monthlyRentEur}
                                        onChange={(event) => setMonthlyRentEur(Number(event.target.value || 0))}
                                        className={inputClass}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="From">
                                        <MonthSelect value={rentStartMonth} onChange={setRentStartMonth} />
                                    </Field>
                                    <Field label="To">
                                        <MonthSelect value={rentEndMonth} onChange={setRentEndMonth} />
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
                                        value={taxReserve?.tax_rate_percent ?? 15}
                                        onChange={(event) => void patchTaxReserve({ tax_rate_percent: Number(event.target.value || 0), estimated_tax_eur: stats.estimatedTax })}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Due date">
                                    <AdminDatePicker value={taxReserve?.due_date ?? ""} onChange={(date) => void patchTaxReserve({ due_date: date })} />
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => void patchTaxReserve({ paid: !taxReserve?.paid, paid_date: !taxReserve?.paid ? todayIso() : null })}
                                    disabled={!taxReserve}
                                    className={[
                                        "w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                                        taxReserve?.paid
                                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                                            : isTaxDue(taxReserve)
                                                ? "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]"
                                                : "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]",
                                    ].join(" ")}
                                >
                                    {taxReserve?.paid ? "Tax marked paid" : isTaxDue(taxReserve) ? "Tax due / unpaid" : "Tax pending"}
                                </button>
                                <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2 text-[11px] leading-4 text-[#607993]">
                                    Estimate: <span className="font-semibold text-[#0b1623]">{formatEur(stats.estimatedTax)}</span>. Editable reserve only; verify with accountant before payment.
                                </div>
                            </div>
                        </div>
                    </aside>

                    <main className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
                        {loading ? (
                            <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] p-6 text-[13px] font-semibold text-[#607993]">Loading income data...</div>
                        ) : (
                            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {months.map((month) => {
                                    const monthSelected = selectedMonth === month.month;
                                    const expected = month.rent_expected_eur > 0;
                                    const monthExpenses = expensesByMonthId.get(month.id) ?? [];
                                    const ownerCostTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount_eur, 0);
                                    const utilityCount = utilityOrder.filter((key) => month[key]).length;

                                    return (
                                        <button
                                            key={month.id}
                                            type="button"
                                            onClick={() => setSelectedMonth(month.month)}
                                            className={[
                                                "min-h-[170px] rounded-[18px] border p-3 text-left shadow-[0_10px_28px_rgba(41,73,112,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.74] active:scale-[0.99]",
                                                monthSelected ? "border-[#2f80ed]/[0.34] bg-[#2f80ed]/[0.07]" : "border-white/[0.78] bg-white/[0.58]",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-[13px] font-semibold text-[#0b1623]">{monthLabels[month.month - 1]}</div>
                                                    <div className="mt-0.5 text-[10.5px] text-[#7a90a8]">{month.year}</div>
                                                </div>
                                                <span className={[
                                                    "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]",
                                                    !expected
                                                        ? "border-[#9ab0c4]/[0.24] bg-[#9ab0c4]/[0.08] text-[#607993]"
                                                        : month.rent_status === "paid"
                                                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]"
                                                            : "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]",
                                                ].join(" ")}
                                                >
                                                    {!expected ? "No rent" : month.rent_status === "paid" ? "Paid" : month.rent_status === "partial" ? "Partial" : "Unpaid"}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                                                    <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">Expected</div>
                                                    <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{formatEur(month.rent_expected_eur)}</div>
                                                </div>
                                                <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                                                    <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">Paid</div>
                                                    <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">{formatEur(month.rent_paid_eur)}</div>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                <span className="rounded-full border border-[#ccd9e8] bg-white/[0.52] px-2 py-0.5 text-[10px] text-[#607993]">Utilities {utilityCount}/4</span>
                                                {ownerCostTotal > 0 ? (
                                                    <span className="rounded-full border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2 py-0.5 text-[10px] text-[#8c5947]">Owner costs {formatEur(ownerCostTotal)}</span>
                                                ) : null}
                                            </div>

                                            {month.note ? <div className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#7a90a8]">{month.note}</div> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </main>

                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-white/[0.65] bg-white/[0.36] p-3.5 lg:border-l lg:border-t-0">
                        {selected ? (
                            <MonthDetails
                                month={selected}
                                ownerExpenses={expensesByMonthId.get(selected.id) ?? []}
                                onTogglePaid={() => void markRentPaid(selected)}
                                onPatch={(patch) => void patchMonth(selected, patch)}
                                onToggleUtility={(key) => void toggleUtility(selected, key)}
                                onAddExpense={() => setExpenseDraft({ monthId: selected.id, title: "", amountEur: 0 })}
                                onDeleteExpense={(id) => void deleteExpense(id)}
                            />
                        ) : (
                            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 text-[12px] text-[#607993]">No month selected.</div>
                        )}
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
            {monthLabels.map((label, index) => (
                <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                </option>
            ))}
        </select>
    );
}

function MonthDetails({
    month,
    ownerExpenses,
    onTogglePaid,
    onPatch,
    onToggleUtility,
    onAddExpense,
    onDeleteExpense,
}: {
    month: ManagedPropertyIncomeMonth;
    ownerExpenses: ManagedPropertyIncomeOwnerExpense[];
    onTogglePaid: () => void;
    onPatch: (patch: ManagedPropertyIncomeMonthPatch) => void;
    onToggleUtility: (key: UtilityKey) => void;
    onAddExpense: () => void;
    onDeleteExpense: (id: string) => void;
}) {
    return (
        <div className="space-y-2.5">
            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Selected month</div>
                <div className="text-[17px] font-semibold text-[#0b1623]">{monthLabels[month.month - 1]}</div>
                <div className="mt-1 text-[11px] text-[#7a90a8]">Rent and operational checks</div>

                <button
                    type="button"
                    onClick={onTogglePaid}
                    disabled={month.rent_expected_eur <= 0}
                    className={[
                        "mt-3 w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                        month.rent_status === "paid"
                            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                            : "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]",
                    ].join(" ")}
                >
                    {month.rent_status === "paid" ? "Rent paid" : "Mark rent paid"}
                </button>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Rent details</div>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Expected">
                        <input
                            type="number"
                            value={month.rent_expected_eur}
                            onChange={(event) => {
                                const expected = Number(event.target.value || 0);
                                onPatch({ rent_expected_eur: expected, rent_status: deriveRentStatus(expected, month.rent_paid_eur) });
                            }}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Paid">
                        <input
                            type="number"
                            value={month.rent_paid_eur}
                            onChange={(event) => {
                                const paid = Number(event.target.value || 0);
                                onPatch({ rent_paid_eur: paid, rent_status: deriveRentStatus(month.rent_expected_eur, paid) });
                            }}
                            className={inputClass}
                        />
                    </Field>
                </div>
                <div className="mt-2">
                    <Field label="Paid date">
                        <AdminDatePicker value={month.rent_paid_date ?? ""} onChange={(date) => onPatch({ rent_paid_date: date })} />
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
                            onClick={() => onToggleUtility(key)}
                            className={[
                                "rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
                                month[key]
                                    ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                                    : "border-[#ccd9e8] bg-white/[0.56] text-[#607993]",
                            ].join(" ")}
                        >
                            {month[key] ? "✓ " : "○ "}{utilityLabels[key]}
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
                    {ownerExpenses.length === 0 ? (
                        <div className="text-[12px] text-[#7a90a8]">No owner expenses this month.</div>
                    ) : (
                        ownerExpenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2">
                                <div className="min-w-0">
                                    <div className="truncate text-[12px] font-semibold text-[#0b1623]">{expense.title}</div>
                                    <div className="text-[10.5px] text-[#7a90a8]">{formatEur(expense.amount_eur)}</div>
                                </div>
                                <button type="button" onClick={() => onDeleteExpense(expense.id)} className="text-[11px] font-semibold text-[#9d2f2f] transition hover:text-[#6f1f1f]">
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Note</div>
                <textarea
                    value={month.note ?? ""}
                    onChange={(event) => onPatch({ note: event.target.value })}
                    rows={3}
                    className={`${inputClass} resize-none`}
                    placeholder="Month note"
                />
            </div>
        </div>
    );
}

function ExpenseEditor({
    draft,
    onChange,
    onSave,
    onCancel,
}: {
    draft: ExpenseDraft;
    onChange: (draft: ExpenseDraft) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06101d]/[0.28] p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-md rounded-[22px] border border-white/[0.78] bg-white/[0.86] p-4 shadow-[0_28px_80px_rgba(6,16,29,0.28)] backdrop-blur-2xl">
                <div className="mb-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Owner expense</div>
                <div className="space-y-3">
                    <Field label="Title">
                        <input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} className={inputClass} autoFocus />
                    </Field>
                    <Field label="Amount EUR">
                        <input type="number" value={draft.amountEur} onChange={(event) => onChange({ ...draft, amountEur: Number(event.target.value || 0) })} className={inputClass} />
                    </Field>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] px-4 py-2 text-[12px] font-semibold text-[#607993] transition hover:bg-white">
                        Cancel
                    </button>
                    <button type="button" onClick={onSave} className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-4 py-2 text-[12px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">
                        Save expense
                    </button>
                </div>
            </div>
        </div>
    );
}
