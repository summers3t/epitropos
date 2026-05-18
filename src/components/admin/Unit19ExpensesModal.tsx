"use client";

import { useEffect, useMemo, useState } from "react";
import {
    EUR_TO_BGN,
    unit19Expenses,
    type Unit19Expense,
    type Unit19ExpenseCategory,
    type Unit19ExpenseStatus,
} from "@/lib/admin/unit19ExpensesData";

type Props = {
    open: boolean;
    onClose: () => void;
};

type ExpenseFilter = "all" | Unit19ExpenseCategory;
type StatusFilter = "active" | Unit19ExpenseStatus | "all";

const categoryLabels: Record<Unit19ExpenseCategory, string> = {
    "Bulgarian documents": "BG documents",
    "Greek setup & legal": "Greek setup",
    "Credit / DSK": "Credit / DSK",
    "Greek closing": "Greek closing",
    "Post-acquisition": "Post-acq.",
    "Vehicle / excluded": "Excluded",
};

const statusLabels: Record<Unit19ExpenseStatus, string> = {
    paid: "Paid",
    clarify: "Clarify",
    excluded: "Excluded",
};

const categoryOrder: Unit19ExpenseCategory[] = [
    "Bulgarian documents",
    "Greek setup & legal",
    "Credit / DSK",
    "Greek closing",
    "Post-acquisition",
    "Vehicle / excluded",
];

const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
});

function formatEur(value: number) {
    return currency.format(value);
}

function formatBgn(value: number) {
    return `${number.format(value)} BGN`;
}

function getStatusClasses(status: Unit19ExpenseStatus) {
    if (status === "paid") {
        return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]";
    }

    if (status === "clarify") {
        return "border-[#cfa090]/[0.32] bg-[#cfa090]/[0.11] text-[#8c5947]";
    }

    return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.10] text-[#4e6880]";
}

function recalcFromEur(value: number) {
    return Number((value * EUR_TO_BGN).toFixed(2));
}

function recalcFromBgn(value: number) {
    return Number((value / EUR_TO_BGN).toFixed(2));
}

function IconClose() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function IconExpense() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}

export default function Unit19ExpensesModal({ open, onClose }: Props) {
    const [expenses, setExpenses] = useState<Unit19Expense[]>(unit19Expenses);
    const [categoryFilter, setCategoryFilter] = useState<ExpenseFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [query, setQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    const activeExpenses = useMemo(
        () => expenses.filter((expense) => expense.status !== "excluded"),
        [expenses],
    );

    const stats = useMemo(() => {
        const total = activeExpenses.reduce((sum, expense) => sum + expense.eur, 0);
        const greekClosing = activeExpenses
            .filter((expense) => expense.category === "Greek closing")
            .reduce((sum, expense) => sum + expense.eur, 0);
        const credit = activeExpenses
            .filter((expense) => expense.category === "Credit / DSK")
            .reduce((sum, expense) => sum + expense.eur, 0);
        const clarify = activeExpenses.filter((expense) => expense.status === "clarify");

        return {
            total,
            greekClosing,
            credit,
            clarifyAmount: clarify.reduce((sum, expense) => sum + expense.eur, 0),
            clarifyCount: clarify.length,
            trackedCount: activeExpenses.length,
        };
    }, [activeExpenses]);

    const categoryTotals = useMemo(() => {
        const values = categoryOrder.map((category) => {
            const total = activeExpenses
                .filter((expense) => expense.category === category)
                .reduce((sum, expense) => sum + expense.eur, 0);

            return { category, total };
        });

        const max = Math.max(...values.map((item) => item.total), 1);

        return values.map((item) => ({
            ...item,
            percent: Math.round((item.total / max) * 100),
        }));
    }, [activeExpenses]);

    const filteredExpenses = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return expenses.filter((expense) => {
            if (categoryFilter !== "all" && expense.category !== categoryFilter) {
                return false;
            }

            if (statusFilter === "active" && expense.status === "excluded") {
                return false;
            }

            if (statusFilter !== "all" && statusFilter !== "active" && expense.status !== statusFilter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return [expense.title, expense.issuer, expense.note, expense.category]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery);
        });
    }, [categoryFilter, expenses, query, statusFilter]);

    function patchExpense(id: string, patch: Partial<Unit19Expense>) {
        setExpenses((current) =>
            current.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)),
        );
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] overflow-hidden px-3 py-3 sm:px-5">
            <button
                type="button"
                aria-label="Close expenses modal"
                className="fixed inset-0 cursor-default bg-[#06101d]/[0.52] backdrop-blur-[10px]"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-white/[0.72] bg-white/[0.74] shadow-[0_30px_120px_rgba(6,16,29,0.38),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(47,128,237,0.13),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(166,139,74,0.16),transparent_24%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.62] to-transparent" />

                <div className="relative shrink-0 border-b border-white/[0.72] px-5 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">
                                <IconExpense />
                                Expense cockpit
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                Unit 19 Expense Tracker
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.78] bg-white/[0.62] text-[#6f849d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                        >
                            <IconClose />
                        </button>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-[16px] border border-white/[0.80] bg-white/[0.62] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Total tracked</div>
                            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{formatEur(stats.total)}</div>
                            <div className="mt-1 text-[10px] text-[#7a90a8]">{stats.trackedCount} active rows</div>
                        </div>
                        <div className="rounded-[16px] border border-white/[0.80] bg-white/[0.62] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Greek closing</div>
                            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{formatEur(stats.greekClosing)}</div>
                            <div className="mt-1 text-[10px] text-[#7a90a8]">tax, notary, broker</div>
                        </div>
                        <div className="rounded-[16px] border border-white/[0.80] bg-white/[0.62] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Credit / DSK</div>
                            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{formatEur(stats.credit)}</div>
                            <div className="mt-1 text-[10px] text-[#7a90a8]">loan path costs</div>
                        </div>
                        <div className="rounded-[16px] border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.06)]">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8c5947]">Need clarification</div>
                            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{formatEur(stats.clarifyAmount)}</div>
                            <div className="mt-1 text-[10px] text-[#8c5947]">{stats.clarifyCount} rows to verify</div>
                        </div>
                        <div className="rounded-[16px] border border-white/[0.80] bg-white/[0.62] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">BGN equivalent</div>
                            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{formatBgn(stats.total * EUR_TO_BGN)}</div>
                            <div className="mt-1 text-[10px] text-[#7a90a8]">fixed 1.95583</div>
                        </div>
                    </div>
                </div>

                <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.42] p-3.5 lg:border-b-0 lg:border-r">
                        <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Cost composition</div>
                            <div className="space-y-2">
                                {categoryTotals
                                    .filter((item) => item.category !== "Vehicle / excluded")
                                    .map((item) => (
                                        <button
                                            key={item.category}
                                            type="button"
                                            onClick={() => setCategoryFilter(item.category)}
                                            className="w-full rounded-xl border border-transparent p-2 text-left transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.20] hover:bg-white/[0.55] active:scale-[0.98]"
                                        >
                                            <div className="flex items-center justify-between gap-3 text-[11.5px] font-semibold text-[#0b1623]">
                                                <span>{categoryLabels[item.category]}</span>
                                                <span>{formatEur(item.total)}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d8e8f6]/[0.9]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#2f80ed] to-[#74aef8] transition-all duration-700"
                                                    style={{ width: `${item.percent}%` }}
                                                />
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Filters</div>
                            <div className="space-y-1.5">
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value as ExpenseFilter)}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    <option value="all">All categories</option>
                                    {categoryOrder.map((category) => (
                                        <option key={category} value={category}>
                                            {categoryLabels[category]}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    <option value="active">Active only</option>
                                    <option value="all">All rows</option>
                                    <option value="paid">Paid</option>
                                    <option value="clarify">Clarify</option>
                                    <option value="excluded">Excluded</option>
                                </select>

                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a90a8]">
                                        <IconSearch />
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search costs, issuer, notes..."
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] py-1.5 pl-8 pr-3 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
                        <div className="overflow-x-auto rounded-[18px] border border-white/[0.78] bg-white/[0.58] shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="min-w-[820px]">
                                <div className="grid grid-cols-[minmax(250px,1.75fr)_125px_85px_90px_105px] gap-0 border-b border-[#d8e8f6]/[0.82] bg-white/[0.70] px-3.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">
                                    <div>Cost</div>
                                    <div>Category</div>
                                    <div>EUR</div>
                                    <div>Status</div>
                                    <div className="text-right">Actions</div>
                                </div>

                                <div className="divide-y divide-[#d8e8f6]/[0.72]">
                                    {filteredExpenses.map((expense) => {
                                        const editing = editingId === expense.id;

                                        return (
                                            <div
                                                key={expense.id}
                                                className={[
                                                    "grid grid-cols-[minmax(250px,1.75fr)_125px_85px_90px_105px] gap-0 px-3.5 py-2 transition hover:bg-white/[0.55]",
                                                    expense.status === "excluded" ? "opacity-55" : "",
                                                ].join(" ")}
                                            >
                                                <div className="min-w-0 pr-4">
                                                    {editing ? (
                                                        <div className="space-y-1.5">
                                                            <input
                                                                value={expense.title}
                                                                onChange={(event) => patchExpense(expense.id, { title: event.target.value })}
                                                                className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                            />
                                                            <input
                                                                value={expense.issuer}
                                                                onChange={(event) => patchExpense(expense.id, { issuer: event.target.value })}
                                                                className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2.5 py-1.5 text-[10.5px] text-[#4e6880] outline-none focus:border-[#2f80ed]"
                                                            />
                                                            <textarea
                                                                value={expense.note}
                                                                onChange={(event) => patchExpense(expense.id, { note: event.target.value })}
                                                                rows={2}
                                                                className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2.5 py-1.5 text-[10.5px] text-[#4e6880] outline-none focus:border-[#2f80ed]"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="truncate text-[12.5px] font-semibold leading-tight text-[#0b1623]">{expense.title}</div>
                                                            <div className="mt-0.5 truncate text-[10.5px] leading-snug text-[#607993]">{expense.issuer || "—"}</div>
                                                            <div className="mt-0.5 max-h-7 overflow-hidden text-[10.5px] leading-3.5 text-[#7a90a8]">{expense.note || "No notes"}</div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="pr-3">
                                                    {editing ? (
                                                        <select
                                                            value={expense.category}
                                                            onChange={(event) => patchExpense(expense.id, { category: event.target.value as Unit19ExpenseCategory })}
                                                            className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2 py-1.5 text-[10.5px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                        >
                                                            {categoryOrder.map((category) => (
                                                                <option key={category} value={category}>
                                                                    {categoryLabels[category]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="rounded-full border border-[#ccd9e8] bg-white/[0.58] px-2 py-0.5 text-[9.5px] font-semibold text-[#4e6880]">
                                                            {categoryLabels[expense.category]}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="pr-3">
                                                    {editing ? (
                                                        <div className="space-y-1.5">
                                                            <input
                                                                value={expense.eur}
                                                                type="number"
                                                                step="0.01"
                                                                onChange={(event) => {
                                                                    const eur = Number(event.target.value || 0);
                                                                    patchExpense(expense.id, { eur, bgn: recalcFromEur(eur) });
                                                                }}
                                                                className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2 py-1.5 text-[10.5px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                            />
                                                            <input
                                                                value={expense.bgn}
                                                                type="number"
                                                                step="0.01"
                                                                onChange={(event) => {
                                                                    const bgn = Number(event.target.value || 0);
                                                                    patchExpense(expense.id, { bgn, eur: recalcFromBgn(bgn) });
                                                                }}
                                                                className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2 py-1.5 text-[10.5px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-[12.5px] font-semibold text-[#0b1623]">{formatEur(expense.eur)}</div>
                                                            <div className="mt-0.5 text-[10px] text-[#7a90a8]">{formatBgn(expense.bgn)}</div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="pr-3">
                                                    {editing ? (
                                                        <select
                                                            value={expense.status}
                                                            onChange={(event) => patchExpense(expense.id, { status: event.target.value as Unit19ExpenseStatus })}
                                                            className="w-full rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2 py-1.5 text-[10.5px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                        >
                                                            <option value="paid">Paid</option>
                                                            <option value="clarify">Clarify</option>
                                                            <option value="excluded">Excluded</option>
                                                        </select>
                                                    ) : (
                                                        <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]", getStatusClasses(expense.status)].join(" ")}>
                                                            {statusLabels[expense.status]}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-start justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingId(editing ? null : expense.id)}
                                                        className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-2 py-1 text-[10.5px] font-semibold text-[#4e6880] transition hover:border-[#2f80ed]/[0.32] hover:bg-white/[0.88] hover:text-[#2060cc] active:scale-[0.97]"
                                                    >
                                                        {editing ? "Done" : "Edit"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            patchExpense(expense.id, {
                                                                status: expense.status === "excluded" ? "paid" : "excluded",
                                                            })
                                                        }
                                                        className="rounded-lg border border-[#ccd9e8] bg-white/[0.45] px-2 py-1 text-[10.5px] font-semibold text-[#7a90a8] transition hover:bg-white/[0.82] active:scale-[0.97]"
                                                    >
                                                        {expense.status === "excluded" ? "Include" : "Exclude"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredExpenses.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-[#7a90a8]">
                                        No matching expenses.
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
