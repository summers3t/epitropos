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

type Unit19DocumentsModalProps = {
  open: boolean;
  onClose: () => void;
};

type ViewMode = "cards" | "compact";

type DraftDocument = Omit<Unit19DocumentRecord, "order"> & { order?: number };

const STORAGE_KEY = "epitropos.unit19.documents.v1";

const statusLabel: Record<Unit19DocumentStatus, string> = {
  available: "Available",
  watchlist: "Watchlist",
  trace_only: "Trace only",
  pending: "Pending",
  missing: "Missing",
  deferred: "Deferred",
  weak_evidence: "Weak evidence",
};

const priorityLabel: Record<Unit19DocumentPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const statusClass: Record<Unit19DocumentStatus, string> = {
  available: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  watchlist: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  trace_only: "border-sky-300/25 bg-sky-400/10 text-sky-100",
  pending: "border-blue-300/25 bg-blue-400/10 text-blue-100",
  missing: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  deferred: "border-stone-300/25 bg-stone-400/10 text-stone-100",
  weak_evidence: "border-orange-300/25 bg-orange-400/10 text-orange-100",
};

const priorityClass: Record<Unit19DocumentPriority, string> = {
  critical: "border-rose-300/30 bg-rose-500/15 text-rose-100",
  high: "border-amber-300/25 bg-amber-500/10 text-amber-100",
  medium: "border-slate-300/20 bg-white/5 text-slate-200",
  low: "border-white/10 bg-white/[0.03] text-slate-300",
};

const statusOptions: Array<{ value: Unit19DocumentStatus | "all" | "critical"; label: string }> = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "available", label: "Available" },
  { value: "watchlist", label: "Watchlist" },
  { value: "trace_only", label: "Trace only" },
  { value: "pending", label: "Pending" },
  { value: "missing", label: "Missing" },
  { value: "deferred", label: "Deferred" },
  { value: "weak_evidence", label: "Weak evidence" },
];

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
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

export default function Unit19DocumentsModal({ open, onClose }: Unit19DocumentsModalProps) {
  const initialState = useMemo(() => loadInitialState(), []);
  const [categories, setCategories] = useState<Unit19DocumentCategory[]>(initialState.categories);
  const [documents, setDocuments] = useState<Unit19DocumentRecord[]>(initialState.documents);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<Unit19DocumentStatus | "all" | "critical">("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [editingDocument, setEditingDocument] = useState<DraftDocument | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

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
      const matchesCategory = selectedCategory === "all" || document.categoryId === selectedCategory;
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "critical" ? document.priority === "critical" : document.status === selectedStatus);

      const searchable = normalizeText(
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
      );

      return matchesCategory && matchesStatus && (!cleanQuery || searchable.includes(cleanQuery));
    });
  }, [categoryById, query, selectedCategory, selectedStatus, sortedDocuments]);

  const counts = useMemo(() => {
    return {
      available: documents.filter((document) => document.status === "available").length,
      watchlist: documents.filter((document) => document.status === "watchlist").length,
      pending: documents.filter((document) => ["pending", "missing"].includes(document.status)).length,
      critical: documents.filter((document) => document.priority === "critical").length,
    };
  }, [documents]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const document of documents) map.set(document.categoryId, (map.get(document.categoryId) ?? 0) + 1);
    return map;
  }, [documents]);

  const criticalOpenItems = useMemo(() => {
    return documents
      .filter(
        (document) =>
          document.priority === "critical" && ["pending", "missing", "watchlist"].includes(document.status),
      )
      .sort((a, b) => a.order - b.order)
      .slice(0, 8);
  }, [documents]);

  const weakEvidenceItems = useMemo(() => {
    return documents
      .filter((document) => ["trace_only", "weak_evidence"].includes(document.status))
      .sort((a, b) => a.order - b.order)
      .slice(0, 5);
  }, [documents]);

  if (!open) return null;

  const nextOrder = documents.reduce((max, document) => Math.max(max, document.order), 0) + 1;

  function saveDocument() {
    if (!editingDocument) return;
    const trimmedTitle = editingDocument.title.trim();
    if (!trimmedTitle) return;

    const cleanDocument: Unit19DocumentRecord = {
      ...editingDocument,
      id: editingDocument.id || `local-${Date.now()}`,
      order: editingDocument.order ?? nextOrder,
      title: trimmedTitle,
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
      tags: editingDocument.tags?.filter(Boolean),
    };

    setDocuments((current) => {
      const exists = current.some((document) => document.id === cleanDocument.id);
      if (exists) return current.map((document) => (document.id === cleanDocument.id ? cleanDocument : document));
      return [...current, cleanDocument];
    });
    setEditingDocument(null);
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

  function renameCategory() {
    const name = editingCategoryName.trim();
    if (!editingCategoryId || !name) return;
    setCategories((current) =>
      current.map((category) => (category.id === editingCategoryId ? { ...category, name } : category)),
    );
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  function deleteCategory(categoryId: string) {
    const fallback = categories.find((category) => category.id !== categoryId)?.id ?? "uncategorized";
    setDocuments((current) =>
      current.map((document) => (document.categoryId === categoryId ? { ...document, categoryId: fallback } : document)),
    );
    setCategories((current) => current.filter((category) => category.id !== categoryId));
    if (selectedCategory === categoryId) setSelectedCategory("all");
  }

  function resetSeed() {
    setCategories(unit19DocumentCategories);
    setDocuments(unit19DocumentsSeed);
    setEditingDocument(null);
    setSelectedCategory("all");
    setSelectedStatus("all");
    setQuery("");
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-slate-950/80 px-4 py-5 text-slate-100 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        aria-label="Close documents modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,139,74,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(135deg,rgba(15,28,46,0.92),rgba(15,23,42,0.88))]" />

        <header className="relative border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/80">Unit 19 archive</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Documents</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Greek acquisition evidence register. Tracks what is available, what is only a trace, and what still
                needs documentary closure.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingDocument(createBlankDocument(categories, nextOrder))}
                className="rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-200/15 active:scale-[0.98]"
              >
                Add document
              </button>
              <button
                type="button"
                onClick={resetSeed}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Reset seed
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Available" value={counts.available} tone="green" />
            <SummaryCard label="Watchlist" value={counts.watchlist} tone="amber" />
            <SummaryCard label="Pending / missing" value={counts.pending} tone="blue" />
            <SummaryCard label="Critical" value={counts.critical} tone="rose" />
          </div>
        </header>

        <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="min-h-0 overflow-y-auto border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-3 shadow-xl shadow-black/10">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                  selectedCategory === "all" ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span>All categories</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{documents.length}</span>
              </button>

              <div className="mt-2 space-y-1">
                {categories.map((category) => (
                  <div key={category.id} className="group rounded-2xl hover:bg-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                        selectedCategory === category.id ? "bg-white/12 text-white" : "text-slate-300"
                      }`}
                    >
                      <span className="min-w-0 truncate">{category.name}</span>
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {categoryCounts.get(category.id) ?? 0}
                      </span>
                    </button>
                    <div className="hidden gap-1 px-3 pb-2 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                        className="text-xs text-slate-400 transition hover:text-white"
                      >
                        Rename
                      </button>
                      <span className="text-xs text-slate-600">/</span>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category.id)}
                        className="text-xs text-slate-400 transition hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Categories</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={categoryDraft}
                  onChange={(event) => setCategoryDraft(event.target.value)}
                  placeholder="Add category"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-200/40"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm text-slate-200 transition hover:bg-white/[0.1]"
                >
                  Add
                </button>
              </div>
              {editingCategoryId ? (
                <div className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-200/5 p-2">
                  <input
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none focus:border-amber-200/40"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={renameCategory}
                      className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs text-amber-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <main className="min-h-0 overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_160px_150px]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by document, file, KAEK, amount, AADE, PEA, cadastre..."
                  className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-200/40"
                />
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value as Unit19DocumentStatus | "all" | "critical")}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-200/40"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "cards" ? "compact" : "cards")}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.08]"
                >
                  {viewMode === "cards" ? "Compact view" : "Card view"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedStatus("all");
                    setSelectedCategory("all");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Clear filters
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Showing {filteredDocuments.length} of {documents.length} records. Changes are local to this browser.
              </p>
            </div>

            <div className="h-full min-h-0 overflow-y-auto p-4 pb-28">
              {filteredDocuments.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-slate-300">
                  No documents match the current filters.
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredDocuments.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      category={categoryById.get(document.categoryId)}
                      onEdit={() => setEditingDocument(document)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
                  {filteredDocuments.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setEditingDocument(document)}
                      className="grid w-full gap-3 border-b border-white/10 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-white/[0.045] lg:grid-cols-[46px_minmax(0,1fr)_150px_120px]"
                    >
                      <span className="text-slate-500">#{document.order}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-white">{document.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-400">
                          {document.fileName || document.source || "No file/source"}
                        </span>
                      </span>
                      <span className="truncate text-slate-300">{categoryById.get(document.categoryId)?.name ?? "—"}</span>
                      <span className={`w-fit rounded-full border px-2 py-1 text-xs ${statusClass[document.status]}`}>
                        {statusLabel[document.status]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto p-4">
            <div className="rounded-3xl border border-rose-200/15 bg-rose-500/[0.06] p-4 shadow-xl shadow-black/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-100/80">Critical open issues</p>
              <div className="mt-3 space-y-3">
                {criticalOpenItems.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setEditingDocument(document)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusClass[document.status]}`}>
                        {statusLabel[document.status]}
                      </span>
                      <span className="text-[11px] text-slate-500">#{document.order}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-5 text-white">{document.title}</p>
                    {document.nextAction ? <p className="mt-1 text-xs leading-5 text-slate-300">{document.nextAction}</p> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Trace / weak evidence</p>
              <div className="mt-3 space-y-2">
                {weakEvidenceItems.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setEditingDocument(document)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <p className="text-sm font-medium text-white">{document.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{document.controlNote || document.proves}</p>
                  </button>
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
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "blue" | "rose" }) {
  const toneClass = {
    green: "from-emerald-400/15 to-emerald-400/5 text-emerald-100",
    amber: "from-amber-400/15 to-amber-400/5 text-amber-100",
    blue: "from-blue-400/15 to-blue-400/5 text-blue-100",
    rose: "from-rose-400/15 to-rose-400/5 text-rose-100",
  }[tone];

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${toneClass} p-4 shadow-lg shadow-black/10`}>
      <p className="text-xs uppercase tracking-[0.2em] text-current/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DocumentCard({
  document,
  category,
  onEdit,
}: {
  document: Unit19DocumentRecord;
  category?: Unit19DocumentCategory;
  onEdit: () => void;
}) {
  const amount = formatAmount(document.amountEur);

  return (
    <article className="group rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/[0.065] hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">#{document.order}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusClass[document.status]}`}>
              {statusLabel[document.status]}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${priorityClass[document.priority]}`}>
              {priorityLabel[document.priority]}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-white">{document.title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 opacity-100 transition hover:bg-white/[0.08] hover:text-white lg:opacity-0 lg:group-hover:opacity-100"
        >
          Edit
        </button>
      </div>

      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-100/70">{category?.name ?? "Uncategorized"}</p>

      {document.fileName || document.source ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-300">
          <span className="text-slate-500">{document.fileName ? "File" : "Source"}: </span>
          <span className="break-words text-slate-200">{document.fileName || document.source}</span>
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-slate-300">{document.proves}</p>

      {document.controlNote ? (
        <div className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-50/90">
          <span className="font-semibold">Control note: </span>
          {document.controlNote}
        </div>
      ) : null}

      {document.nextAction ? (
        <div className="mt-2 rounded-2xl border border-blue-200/15 bg-blue-300/[0.06] p-3 text-xs leading-5 text-blue-50/90">
          <span className="font-semibold">Next action: </span>
          {document.nextAction}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        {document.date ? <span className="rounded-full bg-white/[0.05] px-2 py-1">{document.date}</span> : null}
        {amount ? <span className="rounded-full bg-white/[0.05] px-2 py-1">{amount}</span> : null}
        {document.tags?.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
    </article>
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
    <div className="absolute inset-y-0 right-0 z-10 flex w-full max-w-xl flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">Edit record</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Document details</h3>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <Field label="Title">
          <input
            value={document.title}
            onChange={(event) => onChange({ ...document, title: event.target.value })}
            className="field-input"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={document.categoryId}
              onChange={(event) => onChange({ ...document, categoryId: event.target.value })}
              className="field-input"
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
              className="field-input"
            >
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Priority">
            <select
              value={document.priority}
              onChange={(event) => onChange({ ...document, priority: event.target.value as Unit19DocumentPriority })}
              className="field-input"
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              value={document.date ?? ""}
              onChange={(event) => onChange({ ...document, date: event.target.value })}
              placeholder="YYYY-MM-DD"
              className="field-input"
            />
          </Field>
          <Field label="Amount EUR">
            <input
              value={document.amountEur ?? ""}
              onChange={(event) =>
                onChange({
                  ...document,
                  amountEur: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
              type="number"
              className="field-input"
            />
          </Field>
        </div>

        <Field label="File name">
          <input
            value={document.fileName ?? ""}
            onChange={(event) => onChange({ ...document, fileName: event.target.value })}
            className="field-input"
          />
        </Field>

        <Field label="Source">
          <input
            value={document.source ?? ""}
            onChange={(event) => onChange({ ...document, source: event.target.value })}
            className="field-input"
          />
        </Field>

        <Field label="What it proves">
          <textarea
            value={document.proves}
            onChange={(event) => onChange({ ...document, proves: event.target.value })}
            rows={4}
            className="field-input resize-none"
          />
        </Field>

        <Field label="Control note">
          <textarea
            value={document.controlNote ?? ""}
            onChange={(event) => onChange({ ...document, controlNote: event.target.value })}
            rows={3}
            className="field-input resize-none"
          />
        </Field>

        <Field label="Next action">
          <textarea
            value={document.nextAction ?? ""}
            onChange={(event) => onChange({ ...document, nextAction: event.target.value })}
            rows={3}
            className="field-input resize-none"
          />
        </Field>

        <Field label="Tags, comma separated">
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
            className="field-input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-5">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-rose-200/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/15"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-200/15"
          >
            Save locally
          </button>
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.62);
          padding: 0.65rem 0.85rem;
          color: white;
          outline: none;
        }
        .field-input:focus {
          border-color: rgba(253, 230, 138, 0.42);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
