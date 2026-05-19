"use client";

import { useEffect, useMemo, useState } from "react";
import {
    unit19DocumentCategories,
    unit19DocumentsSeed,
    type Unit19DocumentCategory,
    type Unit19DocumentPriority,
    type Unit19DocumentRecord,
    type Unit19DocumentStatus,
} from "@/lib/admin/unit19DocumentsData";

type Props = {
    open: boolean;
    onClose: () => void;
};

type DocumentStatusFilter = "all" | "active" | "critical" | Unit19DocumentStatus;
type DraftDocument = Omit<Unit19DocumentRecord, "order"> & { order?: number };

const STORAGE_KEY = "epitropos.unit19.documents.v3.light-table";

const statusLabels: Record<Unit19DocumentStatus, string> = {
    available: "Available",
    watchlist: "Watchlist",
    trace_only: "Trace",
    pending: "Pending",
    missing: "Missing",
    deferred: "Deferred",
    weak_evidence: "Weak",
};

const statusOptions: { value: DocumentStatusFilter; label: string }[] = [
    { value: "all", label: "All records" },
    { value: "active", label: "Active control" },
    { value: "critical", label: "Critical" },
    { value: "available", label: "Available" },
    { value: "watchlist", label: "Watchlist" },
    { value: "trace_only", label: "Trace only" },
    { value: "pending", label: "Pending" },
    { value: "missing", label: "Missing" },
    { value: "deferred", label: "Deferred" },
    { value: "weak_evidence", label: "Weak evidence" },
];

const priorityLabels: Record<Unit19DocumentPriority, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};

function getStatusClasses(status: Unit19DocumentStatus) {
    if (status === "available") return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]";
    if (status === "watchlist") return "border-[#cfa090]/[0.32] bg-[#cfa090]/[0.11] text-[#8c5947]";
    if (status === "trace_only") return "border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] text-[#1560bc]";
    if (status === "pending") return "border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.08] text-[#5e38a0]";
    if (status === "missing") return "border-[#d85b68]/[0.26] bg-[#d85b68]/[0.08] text-[#a73642]";
    if (status === "deferred") return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.10] text-[#4e6880]";
    return "border-[#d18c3f]/[0.28] bg-[#d18c3f]/[0.09] text-[#955b1e]";
}

function getPriorityClasses(priority: Unit19DocumentPriority) {
    if (priority === "critical") return "border-[#d85b68]/[0.26] bg-[#d85b68]/[0.08] text-[#a73642]";
    if (priority === "high") return "border-[#a68b4a]/[0.26] bg-[#a68b4a]/[0.09] text-[#7a6228]";
    if (priority === "medium") return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.09] text-[#4e6880]";
    return "border-[#ccd9e8] bg-white/[0.58] text-[#7a90a8]";
}

function formatAmount(amount?: number) {
    if (typeof amount !== "number") return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
}

function normalizeText(value: string) {
    return value.trim().toLowerCase();
}

function createBlankDocument(categories: Unit19DocumentCategory[], nextOrder: number): DraftDocument {
    return {
        id: `local-${Date.now()}`,
        order: nextOrder,
        title: "New document",
        categoryId: categories[0]?.id ?? "uncategorized",
        status: "pending",
        priority: "medium",
        fileName: "",
        source: "",
        proves: "",
        controlNote: "",
        nextAction: "",
        date: "",
        amountEur: undefined,
        tags: [],
    };
}

function loadInitialState() {
    if (typeof window === "undefined") {
        return {
            categories: unit19DocumentCategories,
            documents: unit19DocumentsSeed,
        };
    }

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return {
                categories: unit19DocumentCategories,
                documents: unit19DocumentsSeed,
            };
        }

        const parsed = JSON.parse(saved) as {
            categories?: Unit19DocumentCategory[];
            documents?: Unit19DocumentRecord[];
        };

        return {
            categories: parsed.categories?.length ? parsed.categories : unit19DocumentCategories,
            documents: parsed.documents?.length ? parsed.documents : unit19DocumentsSeed,
        };
    } catch {
        return {
            categories: unit19DocumentCategories,
            documents: unit19DocumentsSeed,
        };
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

function IconDocument() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h6" />
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

export default function Unit19DocumentsModal({ open, onClose }: Props) {
    const initialState = useMemo(() => loadInitialState(), []);
    const [categories, setCategories] = useState<Unit19DocumentCategory[]>(initialState.categories);
    const [documents, setDocuments] = useState<Unit19DocumentRecord[]>(initialState.documents);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");
    const [query, setQuery] = useState("");
    const [editingDocument, setEditingDocument] = useState<DraftDocument | null>(null);
    const [categoryDraft, setCategoryDraft] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");

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

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, documents }));
    }, [categories, documents]);

    const categoryById = useMemo(() => {
        return new Map(categories.map((category) => [category.id, category]));
    }, [categories]);

    const sortedDocuments = useMemo(() => {
        return [...documents].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const cleanQuery = normalizeText(query);

        return sortedDocuments.filter((document) => {
            if (categoryFilter !== "all" && document.categoryId !== categoryFilter) {
                return false;
            }

            if (statusFilter === "active" && ["available", "deferred"].includes(document.status)) {
                return false;
            }

            if (statusFilter === "critical" && document.priority !== "critical") {
                return false;
            }

            if (statusFilter !== "all" && statusFilter !== "active" && statusFilter !== "critical" && document.status !== statusFilter) {
                return false;
            }

            if (!cleanQuery) {
                return true;
            }

            return normalizeText(
                [
                    document.title,
                    document.fileName,
                    document.source,
                    document.proves,
                    document.controlNote,
                    document.nextAction,
                    document.date,
                    document.amountEur?.toString(),
                    categoryById.get(document.categoryId)?.name,
                    ...(document.tags ?? []),
                ]
                    .filter(Boolean)
                    .join(" "),
            ).includes(cleanQuery);
        });
    }, [categoryById, categoryFilter, query, sortedDocuments, statusFilter]);

    const stats = useMemo(() => {
        const available = documents.filter((document) => document.status === "available").length;
        const watchlist = documents.filter((document) => document.status === "watchlist").length;
        const pending = documents.filter((document) => ["pending", "missing"].includes(document.status)).length;
        const critical = documents.filter((document) => document.priority === "critical").length;
        const trace = documents.filter((document) => ["trace_only", "weak_evidence"].includes(document.status)).length;

        return {
            total: documents.length,
            available,
            watchlist,
            pending,
            critical,
            trace,
        };
    }, [documents]);

    const categoryComposition = useMemo(() => {
        const values = categories.map((category) => {
            const total = documents.filter((document) => document.categoryId === category.id).length;
            const risk = documents.filter(
                (document) =>
                    document.categoryId === category.id &&
                    (document.priority === "critical" || ["watchlist", "pending", "missing"].includes(document.status)),
            ).length;

            return { category, total, risk };
        });

        const max = Math.max(...values.map((item) => item.total), 1);

        return values.map((item) => ({
            ...item,
            percent: Math.round((item.total / max) * 100),
        }));
    }, [categories, documents]);

    const criticalOpenItems = useMemo(() => {
        return documents
            .filter((document) => document.priority === "critical" && ["pending", "missing", "watchlist"].includes(document.status))
            .sort((a, b) => a.order - b.order)
            .slice(0, 8);
    }, [documents]);

    const weakEvidenceItems = useMemo(() => {
        return documents
            .filter((document) => ["trace_only", "weak_evidence"].includes(document.status))
            .sort((a, b) => a.order - b.order)
            .slice(0, 6);
    }, [documents]);

    const nextOrder = documents.reduce((max, document) => Math.max(max, document.order), 0) + 1;

    function saveDocument() {
        if (!editingDocument) return;

        const title = editingDocument.title.trim();
        if (!title) return;

        const cleanDocument: Unit19DocumentRecord = {
            ...editingDocument,
            id: editingDocument.id || `local-${Date.now()}`,
            order: editingDocument.order ?? nextOrder,
            title,
            fileName: editingDocument.fileName?.trim() || undefined,
            source: editingDocument.source?.trim() || undefined,
            proves: editingDocument.proves.trim(),
            controlNote: editingDocument.controlNote?.trim() || undefined,
            nextAction: editingDocument.nextAction?.trim() || undefined,
            date: editingDocument.date?.trim() || undefined,
            amountEur:
                typeof editingDocument.amountEur === "number" && !Number.isNaN(editingDocument.amountEur)
                    ? editingDocument.amountEur
                    : undefined,
            tags: editingDocument.tags?.map((tag) => tag.trim()).filter(Boolean),
        };

        setDocuments((current) => {
            const exists = current.some((document) => document.id === cleanDocument.id);
            if (exists) return current.map((document) => (document.id === cleanDocument.id ? cleanDocument : document));
            return [...current, cleanDocument];
        });
        setEditingDocument(null);
    }

    function patchDocument(id: string, patch: Partial<Unit19DocumentRecord>) {
        setDocuments((current) => current.map((document) => (document.id === id ? { ...document, ...patch } : document)));
    }

    function deleteDocument(id: string) {
        setDocuments((current) => current.filter((document) => document.id !== id));
        setEditingDocument(null);
    }

    function addCategory() {
        const name = categoryDraft.trim();
        if (!name) return;

        const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `category-${Date.now()}`;
        const id = categories.some((category) => category.id === idBase) ? `${idBase}-${Date.now()}` : idBase;

        setCategories((current) => [...current, { id, name, description: "Custom document category." }]);
        setCategoryDraft("");
    }

    function startRenameCategory(category: Unit19DocumentCategory) {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
    }

    function renameCategory() {
        const name = editingCategoryName.trim();
        if (!editingCategoryId || !name) return;

        setCategories((current) => current.map((category) => (category.id === editingCategoryId ? { ...category, name } : category)));
        setEditingCategoryId(null);
        setEditingCategoryName("");
    }

    function deleteCategory(categoryId: string) {
        if (categories.length <= 1) return;

        const fallback = categories.find((category) => category.id !== categoryId)?.id;
        if (!fallback) return;

        setDocuments((current) => current.map((document) => (document.categoryId === categoryId ? { ...document, categoryId: fallback } : document)));
        setCategories((current) => current.filter((category) => category.id !== categoryId));

        if (categoryFilter === categoryId) {
            setCategoryFilter("all");
        }
    }

    function resetSeed() {
        setCategories(unit19DocumentCategories);
        setDocuments(unit19DocumentsSeed);
        setCategoryFilter("all");
        setStatusFilter("all");
        setQuery("");
        setEditingDocument(null);
        setEditingCategoryId(null);
        setEditingCategoryName("");
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] overflow-hidden px-3 py-3 sm:px-5">
            <button
                type="button"
                aria-label="Close documents modal"
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
                                <IconDocument />
                                Document cockpit
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                Unit 19 Document Register
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingDocument(createBlankDocument(categories, nextOrder))}
                                className="rounded-[13px] border border-[#a68b4a]/[0.28] bg-[#a68b4a]/[0.10] px-4 py-2 text-[12px] font-semibold text-[#7a6228] transition hover:-translate-y-0.5 hover:border-[#a68b4a]/[0.42] hover:bg-[#a68b4a]/[0.16] active:scale-[0.96]"
                            >
                                Add document
                            </button>
                            <button
                                type="button"
                                onClick={resetSeed}
                                className="rounded-[13px] border border-[#ccd9e8] bg-white/[0.56] px-4 py-2 text-[12px] font-semibold text-[#4e6880] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                            >
                                Reset seed
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
                        <KpiCard label="Available" value={stats.available} detail={`${stats.total} total records`} />
                        <KpiCard label="Watchlist" value={stats.watchlist} detail="available with control note" tone="amber" />
                        <KpiCard label="Pending / missing" value={stats.pending} detail="documents to obtain" tone="blue" />
                        <KpiCard label="Critical" value={stats.critical} detail="high-risk control items" tone="rose" />
                        <KpiCard label="Trace / weak" value={stats.trace} detail="not full evidence" />
                    </div>
                </div>

                <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)_320px]">
                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.42] p-3.5 lg:border-b-0 lg:border-r">
                        <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Document composition</div>
                            <div className="space-y-2">
                                {categoryComposition.map((item) => (
                                    <button
                                        key={item.category.id}
                                        type="button"
                                        onClick={() => setCategoryFilter(item.category.id)}
                                        className={[
                                            "w-full rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.20] hover:bg-white/[0.55] active:scale-[0.98]",
                                            categoryFilter === item.category.id ? "border-[#2f80ed]/[0.28] bg-white/[0.66]" : "border-transparent",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-center justify-between gap-3 text-[11.5px] font-semibold text-[#0b1623]">
                                            <span className="truncate">{item.category.name}</span>
                                            <span>{item.total}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d8e8f6]/[0.9]">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#2f80ed] to-[#74aef8] transition-all duration-700"
                                                style={{ width: `${item.percent}%` }}
                                            />
                                        </div>
                                        {item.risk ? <div className="mt-1 text-[10px] text-[#8c5947]">{item.risk} control item(s)</div> : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Filters</div>
                            <div className="space-y-1.5">
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    <option value="all">All categories</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as DocumentStatusFilter)}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>

                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a90a8]">
                                        <IconSearch />
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search documents, KAEK, AADE..."
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] py-1.5 pl-8 pr-3 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setCategoryFilter("all");
                                        setStatusFilter("all");
                                        setQuery("");
                                    }}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88] hover:text-[#2060cc]"
                                >
                                    Clear filters
                                </button>
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Add category</div>
                            <div className="flex gap-2">
                                <input
                                    value={categoryDraft}
                                    onChange={(event) => setCategoryDraft(event.target.value)}
                                    placeholder="Category name"
                                    className="min-w-0 flex-1 rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                />
                                <button
                                    type="button"
                                    onClick={addCategory}
                                    className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88] hover:text-[#2060cc]"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </aside>

                    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3 px-1">
                            <div className="text-[11.5px] text-[#7a90a8]">
                                Showing <span className="font-semibold text-[#0b1623]">{filteredDocuments.length}</span> of {documents.length} records. Local browser state.
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingDocument(createBlankDocument(categories, nextOrder))}
                                className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-3 py-1.5 text-[11px] font-semibold text-[#4e6880] transition hover:border-[#2f80ed]/[0.32] hover:bg-white/[0.88] hover:text-[#2060cc] active:scale-[0.97]"
                            >
                                + Document
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-[18px] border border-white/[0.78] bg-white/[0.58] shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="min-w-[980px]">
                                <div className="grid grid-cols-[56px_minmax(320px,1.75fr)_155px_105px_88px_110px] gap-0 border-b border-[#d8e8f6]/[0.82] bg-white/[0.70] px-3.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">
                                    <div>#</div>
                                    <div>Document / evidence</div>
                                    <div>Category</div>
                                    <div>Status</div>
                                    <div>Amount</div>
                                    <div className="text-right">Actions</div>
                                </div>

                                <div className="divide-y divide-[#d8e8f6]/[0.72]">
                                    {filteredDocuments.map((document) => (
                                        <div
                                            key={document.id}
                                            className={[
                                                "grid grid-cols-[56px_minmax(320px,1.75fr)_155px_105px_88px_110px] gap-0 px-3.5 py-2 transition hover:bg-white/[0.55]",
                                                document.status === "deferred" ? "opacity-60" : "",
                                            ].join(" ")}
                                        >
                                            <div className="pr-3 text-[11px] font-semibold tabular-nums text-[#7a90a8]">#{document.order}</div>

                                            <div className="min-w-0 pr-4">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div className="truncate text-[12.5px] font-semibold leading-tight text-[#0b1623]">{document.title}</div>
                                                    <span className={["shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.10em]", getPriorityClasses(document.priority)].join(" ")}>
                                                        {priorityLabels[document.priority]}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 truncate text-[10.5px] leading-snug text-[#607993]">
                                                    {document.fileName || document.source || "No file/source"}
                                                </div>
                                                <div className="mt-0.5 max-h-7 overflow-hidden text-[10.5px] leading-3.5 text-[#7a90a8]">
                                                    {document.controlNote || document.nextAction || document.proves || "No notes"}
                                                </div>
                                            </div>

                                            <div className="pr-3">
                                                <span className="rounded-full border border-[#ccd9e8] bg-white/[0.58] px-2 py-0.5 text-[9.5px] font-semibold text-[#4e6880]">
                                                    {categoryById.get(document.categoryId)?.name ?? "—"}
                                                </span>
                                            </div>

                                            <div className="pr-3">
                                                <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]", getStatusClasses(document.status)].join(" ")}>
                                                    {statusLabels[document.status]}
                                                </span>
                                            </div>

                                            <div className="pr-3 text-[12px] font-semibold text-[#0b1623]">{formatAmount(document.amountEur)}</div>

                                            <div className="flex items-start justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingDocument(document)}
                                                    className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-2 py-1 text-[10.5px] font-semibold text-[#4e6880] transition hover:border-[#2f80ed]/[0.32] hover:bg-white/[0.88] hover:text-[#2060cc] active:scale-[0.97]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        patchDocument(document.id, {
                                                            status: document.status === "deferred" ? "available" : "deferred",
                                                        })
                                                    }
                                                    className="rounded-lg border border-[#ccd9e8] bg-white/[0.45] px-2 py-1 text-[10.5px] font-semibold text-[#7a90a8] transition hover:bg-white/[0.82] active:scale-[0.97]"
                                                >
                                                    {document.status === "deferred" ? "Restore" : "Defer"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredDocuments.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-[#7a90a8]">
                                        No matching documents.
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-white/[0.65] bg-white/[0.34] p-3.5 lg:border-l lg:border-t-0">
                        <div className="rounded-[16px] border border-[#d85b68]/[0.18] bg-[#d85b68]/[0.06] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#a73642]">Critical open issues</div>
                            <div className="space-y-2">
                                {criticalOpenItems.map((document) => (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => setEditingDocument(document)}
                                        className="w-full rounded-xl border border-white/[0.72] bg-white/[0.58] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.84] active:scale-[0.98]"
                                    >
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className={["rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.10em]", getStatusClasses(document.status)].join(" ")}>
                                                {statusLabels[document.status]}
                                            </span>
                                            <span className="text-[10px] text-[#9ab0c4]">#{document.order}</span>
                                        </div>
                                        <div className="text-[12px] font-semibold leading-snug text-[#0b1623]">{document.title}</div>
                                        <div className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-[#7a90a8]">{document.nextAction || document.controlNote || "Review item."}</div>
                                    </button>
                                ))}

                                {criticalOpenItems.length === 0 ? (
                                    <div className="rounded-xl border border-white/[0.72] bg-white/[0.52] p-3 text-[12px] text-[#7a90a8]">
                                        No critical open issues.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Trace / weak evidence</div>
                            <div className="space-y-2">
                                {weakEvidenceItems.map((document) => (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => setEditingDocument(document)}
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.52] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.84] active:scale-[0.98]"
                                    >
                                        <div className="text-[12px] font-semibold leading-snug text-[#0b1623]">{document.title}</div>
                                        <div className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-[#7a90a8]">{document.controlNote || document.proves}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Category actions</div>
                            <div className="space-y-1.5">
                                {categories.map((category) => (
                                    <div key={category.id} className="rounded-xl border border-[#ccd9e8]/70 bg-white/[0.46] px-2.5 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[11.5px] font-semibold text-[#0b1623]">{category.name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startRenameCategory(category)}
                                                    className="text-[10.5px] font-semibold text-[#4e6880] hover:text-[#2060cc]"
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteCategory(category.id)}
                                                    className="text-[10.5px] font-semibold text-[#9a6b5d] hover:text-[#a73642]"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        {editingCategoryId === category.id ? (
                                            <div className="mt-2 flex gap-1.5">
                                                <input
                                                    value={editingCategoryName}
                                                    onChange={(event) => setEditingCategoryName(event.target.value)}
                                                    className="min-w-0 flex-1 rounded-lg border border-[#ccd9e8] bg-white/[0.86] px-2 py-1 text-[11px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={renameCategory}
                                                    className="rounded-lg border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2 py-1 text-[10.5px] font-semibold text-[#1560bc]"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                {editingDocument ? (
                    <DocumentEditor
                        document={editingDocument}
                        categories={categories}
                        onChange={setEditingDocument}
                        onSave={saveDocument}
                        onCancel={() => setEditingDocument(null)}
                        onDelete={() => deleteDocument(editingDocument.id)}
                    />
                ) : null}
            </div>
        </div>
    );
}

function KpiCard({ label, value, detail, tone = "default" }: { label: string; value: number; detail: string; tone?: "default" | "amber" | "blue" | "rose" }) {
    const toneClasses = {
        default: "border-white/[0.80] bg-white/[0.62] text-[#7a90a8]",
        amber: "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]",
        blue: "border-[#2f80ed]/[0.18] bg-[#2f80ed]/[0.07] text-[#1560bc]",
        rose: "border-[#d85b68]/[0.20] bg-[#d85b68]/[0.07] text-[#a73642]",
    }[tone];

    return (
        <div className={["rounded-[16px] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]", toneClasses].join(" ")}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em]">{label}</div>
            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{value}</div>
            <div className="mt-1 text-[10px]">{detail}</div>
        </div>
    );
}

function DocumentEditor({
    document,
    categories,
    onChange,
    onSave,
    onCancel,
    onDelete,
}: {
    document: DraftDocument;
    categories: Unit19DocumentCategory[];
    onChange: (document: DraftDocument) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06101d]/[0.36] px-4 py-4 backdrop-blur-[7px]">
            <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/[0.76] bg-white/[0.86] shadow-[0_24px_90px_rgba(6,16,29,0.34),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#d8e8f6]/[0.86] px-5 py-4">
                    <div>
                        <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">Document editor</div>
                        <h3 className="mt-1 font-display text-[24px] font-normal tracking-[-0.02em] text-[#0b1623]">
                            {document.title || "New document"}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.78] bg-white/[0.62] text-[#6f849d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                    >
                        <IconClose />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Title">
                            <input
                                value={document.title}
                                onChange={(event) => onChange({ ...document, title: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Category">
                            <select
                                value={document.categoryId}
                                onChange={(event) => onChange({ ...document, categoryId: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            >
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Status">
                            <select
                                value={document.status}
                                onChange={(event) => onChange({ ...document, status: event.target.value as Unit19DocumentStatus })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            >
                                {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Priority">
                            <select
                                value={document.priority}
                                onChange={(event) => onChange({ ...document, priority: event.target.value as Unit19DocumentPriority })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            >
                                {Object.entries(priorityLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="File name">
                            <input
                                value={document.fileName ?? ""}
                                onChange={(event) => onChange({ ...document, fileName: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Source">
                            <input
                                value={document.source ?? ""}
                                onChange={(event) => onChange({ ...document, source: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Date">
                            <input
                                value={document.date ?? ""}
                                onChange={(event) => onChange({ ...document, date: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Amount EUR">
                            <input
                                type="number"
                                step="0.01"
                                value={document.amountEur ?? ""}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    onChange({ ...document, amountEur: value === "" ? undefined : Number(value) });
                                }}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>
                    </div>

                    <div className="mt-3 grid gap-3">
                        <Field label="What it proves">
                            <textarea
                                value={document.proves}
                                onChange={(event) => onChange({ ...document, proves: event.target.value })}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] leading-5 text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Control note">
                            <textarea
                                value={document.controlNote ?? ""}
                                onChange={(event) => onChange({ ...document, controlNote: event.target.value })}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] leading-5 text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Next action">
                            <textarea
                                value={document.nextAction ?? ""}
                                onChange={(event) => onChange({ ...document, nextAction: event.target.value })}
                                rows={2}
                                className="w-full resize-none rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] leading-5 text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Tags, comma-separated">
                            <input
                                value={document.tags?.join(", ") ?? ""}
                                onChange={(event) =>
                                    onChange({
                                        ...document,
                                        tags: event.target.value
                                            .split(",")
                                            .map((tag) => tag.trim())
                                            .filter(Boolean),
                                    })
                                }
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#d8e8f6]/[0.86] px-5 py-4">
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-xl border border-[#d85b68]/[0.24] bg-[#d85b68]/[0.07] px-4 py-2 text-[12px] font-semibold text-[#a73642] transition hover:bg-[#d85b68]/[0.10]"
                    >
                        Delete
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-4 py-2 text-[12px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            className="rounded-xl border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.10] px-4 py-2 text-[12px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]"
                        >
                            Save document
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.15em] text-[#7a90a8]">{label}</span>
            {children}
        </label>
    );
}
