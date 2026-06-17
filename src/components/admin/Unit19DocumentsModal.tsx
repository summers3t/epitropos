"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Unit19ModalSwitcher, { type Unit19PanelKey } from "@/components/admin/Unit19ModalSwitcher";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
    createManagedPropertyDocument,
    createManagedPropertyDocumentCategory,
    createManagedPropertyDocumentSignedUrl,
    deleteManagedPropertyDocument,
    deleteManagedPropertyDocumentCategory,
    getManagedPropertyBySlug,
    getManagedPropertyDocuments,
    removeManagedPropertyDocumentFile,
    updateManagedPropertyDocument,
    updateManagedPropertyDocumentCategory,
    uploadManagedPropertyDocumentFile,
    type ManagedPropertyDocument,
    type ManagedPropertyDocumentCategory,
    type ManagedPropertyDocumentPriority,
    type ManagedPropertyDocumentStatus,
} from "@/lib/admin/managedPropertiesApi";

type Props = {
    open: boolean;
    onClose: () => void;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
    propertySlug?: string;
    projectLabel?: string;
};

type DocumentStatusFilter = "all" | "active" | "critical" | ManagedPropertyDocumentStatus;

type UiCategory = {
    id: string;
    stableKey: string;
    name: string;
    description: string;
    sortOrder: number;
};

type UiDocument = {
    id: string;
    order: number;
    title: string;
    categoryId: string | null;
    status: ManagedPropertyDocumentStatus;
    priority: ManagedPropertyDocumentPriority;
    fileName: string;
    storagePath: string;
    source: string;
    proves: string;
    controlNote: string;
    nextAction: string;
    date: string;
    amountEur: number | undefined;
    tags: string[];
};

type DraftDocument = Omit<UiDocument, "id"> & { id?: string };

type DocumentUndoAction = {
    action: "Deleted" | "Updated";
    label: string;
    restore: () => Promise<void>;
    commit?: () => Promise<void>;
};

const statusLabels: Record<ManagedPropertyDocumentStatus, string> = {
    available: "Available",
    watchlist: "Watchlist",
    trace_only: "Trace",
    pending: "Pending",
    missing: "Missing",
    deferred: "Deferred",
    weak_evidence: "Weak",
};

const priorityLabels: Record<ManagedPropertyDocumentPriority, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
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


function normalizeText(value: string) {
    return value.trim().toLowerCase();
}

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `category-${Date.now()}`;
}

function getStatusClasses(status: ManagedPropertyDocumentStatus) {
    if (status === "available") return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]";
    if (status === "watchlist") return "border-[#cfa090]/[0.32] bg-[#cfa090]/[0.11] text-[#8c5947]";
    if (status === "trace_only") return "border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] text-[#1560bc]";
    if (status === "pending") return "border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.08] text-[#5e38a0]";
    if (status === "missing") return "border-[#d85b68]/[0.26] bg-[#d85b68]/[0.08] text-[#a73642]";
    if (status === "deferred") return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.10] text-[#4e6880]";
    return "border-[#d18c3f]/[0.28] bg-[#d18c3f]/[0.09] text-[#955b1e]";
}


function mapCategory(category: ManagedPropertyDocumentCategory): UiCategory {
    return {
        id: category.id,
        stableKey: category.stable_key,
        name: category.name,
        description: category.description ?? "",
        sortOrder: category.sort_order,
    };
}

function mapDocument(document: ManagedPropertyDocument): UiDocument {
    return {
        id: document.id,
        order: document.sort_order,
        title: document.title,
        categoryId: document.category_id,
        status: document.status,
        priority: document.priority,
        fileName: document.file_name ?? "",
        storagePath: document.storage_path ?? "",
        source: document.source ?? "",
        proves: document.proves ?? "",
        controlNote: document.control_note ?? "",
        nextAction: document.next_action ?? "",
        date: document.document_date ?? "",
        amountEur: typeof document.amount_eur === "number" ? document.amount_eur : undefined,
        tags: Array.isArray(document.tags) ? document.tags : [],
    };
}


function documentToPatch(document: UiDocument) {
    return {
        category_id: document.categoryId,
        title: document.title,
        file_name: document.fileName || null,
        storage_path: document.storagePath || null,
        source: document.source || null,
        proves: document.proves || null,
        control_note: document.controlNote || null,
        next_action: document.nextAction || null,
        document_date: document.date || null,
        amount_eur: typeof document.amountEur === "number" ? document.amountEur : null,
        status: document.status,
        priority: document.priority,
        tags: document.tags,
        sort_order: document.order,
    };
}

function createBlankDocument(categories: UiCategory[], nextOrder: number): DraftDocument {
    return {
        order: nextOrder,
        title: "New document",
        categoryId: categories[0]?.id ?? null,
        status: "pending",
        priority: "medium",
        fileName: "",
        storagePath: "",
        source: "",
        proves: "",
        controlNote: "",
        nextAction: "",
        date: "",
        amountEur: undefined,
        tags: [],
    };
}

export default function Unit19DocumentsModal({ open, onClose, onSwitchPanel, propertySlug = "unit-19", projectLabel = "Unit 19" }: Props) {
    const [managedPropertyId, setManagedPropertyId] = useState<string | null>(null);
    const [categories, setCategories] = useState<UiCategory[]>([]);
    const [documents, setDocuments] = useState<UiDocument[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");
    const [query, setQuery] = useState("");
    const [editingDocument, setEditingDocument] = useState<DraftDocument | null>(null);
    const [categoryDraft, setCategoryDraft] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingDocumentId, setUploadingDocumentId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [undoAction, setUndoAction] = useState<DocumentUndoAction | null>(null);
    const undoActionRef = useRef<DocumentUndoAction | null>(null);
    const undoTimerRef = useRef<number | null>(null);
    const documentRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const property = await getManagedPropertyBySlug(propertySlug);
            const result = await getManagedPropertyDocuments(property.id);

            setManagedPropertyId(property.id);
            setCategories(result.categories.map(mapCategory));
            setDocuments(result.documents.map(mapDocument));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load documents");
        } finally {
            setLoading(false);
        }
    }, [propertySlug]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
        void loadDocuments();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [loadDocuments, onClose, open]);

    useEffect(() => {
        return () => {
            if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
            const pending = undoActionRef.current;
            if (pending?.commit) void pending.commit();
        };
    }, []);

    function queueUndo(
        action: DocumentUndoAction["action"],
        label: string,
        restore: () => Promise<void>,
        commit?: () => Promise<void>,
    ) {
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);

        const previous = undoActionRef.current;
        if (previous?.commit) {
            void previous.commit().catch((commitError: unknown) => {
                setError(commitError instanceof Error ? commitError.message : "Failed to finalize document change");
            });
        }

        const nextAction = { action, label, restore, commit };
        undoActionRef.current = nextAction;
        setUndoAction(nextAction);
        undoTimerRef.current = window.setTimeout(() => {
            const pending = undoActionRef.current;
            undoActionRef.current = null;
            setUndoAction(null);
            if (pending?.commit) {
                void pending.commit().catch(async (commitError: unknown) => {
                    await pending.restore();
                    setError(commitError instanceof Error ? commitError.message : "Failed to finalize document deletion");
                });
            }
        }, 5000);
    }

    const categoryById = useMemo(() => {
        return new Map(categories.map((category) => [category.id, category]));
    }, [categories]);

    const sortedDocuments = useMemo(() => {
        return [...documents].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const cleanQuery = normalizeText(query);

        return sortedDocuments.filter((document) => {
            if (categoryFilter !== "all" && document.categoryId !== categoryFilter) return false;
            if (statusFilter === "active" && ["available", "deferred"].includes(document.status)) return false;
            if (statusFilter === "critical" && document.priority !== "critical") return false;
            if (statusFilter !== "all" && statusFilter !== "active" && statusFilter !== "critical" && document.status !== statusFilter) return false;

            if (!cleanQuery) return true;

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
                    categoryById.get(document.categoryId ?? "")?.name,
                    ...(document.tags ?? []),
                ]
                    .filter(Boolean)
                    .join(" "),
            ).includes(cleanQuery);
        });
    }, [categoryById, categoryFilter, query, sortedDocuments, statusFilter]);

    const stats = useMemo(() => {
        return {
            total: documents.length,
            available: documents.filter((document) => document.status === "available").length,
            watchlist: documents.filter((document) => document.status === "watchlist").length,
            pending: documents.filter((document) => ["pending", "missing"].includes(document.status)).length,
            critical: documents.filter((document) => document.priority === "critical").length,
            trace: documents.filter((document) => ["trace_only", "weak_evidence"].includes(document.status)).length,
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

    async function saveDocument() {
        if (!editingDocument || !managedPropertyId) return;

        const title = editingDocument.title.trim();
        if (!title) return;

        setSaving(true);
        setError(null);

        try {
            const originalDocument = editingDocument.id
                ? documents.find((document) => document.id === editingDocument.id) ?? null
                : null;
            const payload = {
                managed_property_id: managedPropertyId,
                category_id: editingDocument.categoryId || null,
                title,
                file_name: editingDocument.fileName.trim() || null,
                storage_path: editingDocument.storagePath.trim() || null,
                source: editingDocument.source.trim() || null,
                proves: editingDocument.proves.trim() || null,
                control_note: editingDocument.controlNote.trim() || null,
                next_action: editingDocument.nextAction.trim() || null,
                document_date: editingDocument.date || null,
                amount_eur:
                    typeof editingDocument.amountEur === "number" && !Number.isNaN(editingDocument.amountEur)
                        ? editingDocument.amountEur
                        : null,
                status: editingDocument.status,
                priority: editingDocument.priority,
                tags: editingDocument.tags.map((tag) => tag.trim()).filter(Boolean),
                sort_order: editingDocument.order ?? nextOrder,
            };

            const saved = editingDocument.id
                ? await updateManagedPropertyDocument(editingDocument.id, payload)
                : await createManagedPropertyDocument(payload);

            const uiDocument = mapDocument(saved);

            setDocuments((current) => {
                const exists = current.some((document) => document.id === uiDocument.id);
                if (exists) return current.map((document) => (document.id === uiDocument.id ? uiDocument : document));
                return [...current, uiDocument];
            });
            setEditingDocument(null);

            if (!originalDocument) {
                setCategoryFilter("all");
                setStatusFilter("all");
                setQuery("");
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        documentRowRefs.current[uiDocument.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                });
            }

            if (originalDocument) {
                queueUndo("Updated", originalDocument.title, async () => {
                    const restored = await updateManagedPropertyDocument(originalDocument.id, documentToPatch(originalDocument));
                    const restoredUi = mapDocument(restored);
                    setDocuments((current) => current.map((document) => (document.id === restoredUi.id ? restoredUi : document)));
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save document");
        } finally {
            setSaving(false);
        }
    }

    async function patchDocument(id: string, patch: Partial<UiDocument>) {
        setError(null);
        const originalDocument = documents.find((document) => document.id === id);
        if (!originalDocument) return;

        const dbPatch = {
            category_id: patch.categoryId,
            title: patch.title,
            file_name: patch.fileName,
            storage_path: patch.storagePath,
            source: patch.source,
            proves: patch.proves,
            control_note: patch.controlNote,
            next_action: patch.nextAction,
            document_date: patch.date,
            amount_eur: patch.amountEur,
            status: patch.status,
            priority: patch.priority,
            tags: patch.tags,
            sort_order: patch.order,
        };

        try {
            const saved = await updateManagedPropertyDocument(id, dbPatch);
            const uiDocument = mapDocument(saved);
            setDocuments((current) => current.map((document) => (document.id === id ? uiDocument : document)));
            queueUndo("Updated", originalDocument.title, async () => {
                const restored = await updateManagedPropertyDocument(originalDocument.id, documentToPatch(originalDocument));
                const restoredUi = mapDocument(restored);
                setDocuments((current) => current.map((document) => (document.id === restoredUi.id ? restoredUi : document)));
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update document");
        }
    }

    async function deleteDocument(id: string) {
        const deletedDocument = documents.find((document) => document.id === id);
        if (!deletedDocument) return;

        setError(null);
        setDocuments((current) => current.filter((document) => document.id !== id));
        setEditingDocument(null);

        queueUndo(
            "Deleted",
            deletedDocument.title,
            async () => {
                setDocuments((current) =>
                    current.some((document) => document.id === deletedDocument.id)
                        ? current
                        : [...current, deletedDocument].sort((a, b) => a.order - b.order),
                );
            },
            async () => {
                await deleteManagedPropertyDocument(id);
            },
        );
    }

    async function uploadDocumentFile(document: DraftDocument, file: File) {
        if (!document.id || !managedPropertyId) return;

        setUploadingDocumentId(document.id);
        setError(null);

        try {
            const saved = await uploadManagedPropertyDocumentFile({
                managedPropertyId,
                documentId: document.id,
                file,
                previousStoragePath: document.storagePath || null,
            });
            const uiDocument = mapDocument(saved);

            setDocuments((current) => current.map((item) => (item.id === uiDocument.id ? uiDocument : item)));
            setEditingDocument(uiDocument);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload document file");
        } finally {
            setUploadingDocumentId(null);
        }
    }

    async function openDocumentFile(document: DraftDocument) {
        if (!document.storagePath) return;

        setError(null);

        try {
            const signedUrl = await createManagedPropertyDocumentSignedUrl(document.storagePath);
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open document file");
        }
    }

    async function removeDocumentFile(document: DraftDocument) {
        if (!document.id || !document.storagePath) return;

        setUploadingDocumentId(document.id);
        setError(null);

        try {
            const saved = await removeManagedPropertyDocumentFile({
                documentId: document.id,
                storagePath: document.storagePath,
            });
            const uiDocument = mapDocument(saved);

            setDocuments((current) => current.map((item) => (item.id === uiDocument.id ? uiDocument : item)));
            setEditingDocument(uiDocument);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove document file");
        } finally {
            setUploadingDocumentId(null);
        }
    }

    async function addCategory() {
        const name = categoryDraft.trim();
        if (!name || !managedPropertyId) return;

        setSaving(true);
        setError(null);

        try {
            const stableKeyBase = slugify(name);
            const stableKey = categories.some((category) => category.name.toLowerCase() === name.toLowerCase())
                ? `${stableKeyBase}-${Date.now()}`
                : stableKeyBase;
            const saved = await createManagedPropertyDocumentCategory({
                managed_property_id: managedPropertyId,
                stable_key: stableKey,
                name,
                description: "Custom document category.",
                sort_order: categories.length + 1,
            });
            setCategories((current) => [...current, mapCategory(saved)]);
            setCategoryDraft("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add category");
        } finally {
            setSaving(false);
        }
    }

    function startRenameCategory(category: UiCategory) {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
    }

    async function renameCategory() {
        const name = editingCategoryName.trim();
        if (!editingCategoryId || !name) return;

        setSaving(true);
        setError(null);

        try {
            const originalCategory = categories.find((category) => category.id === editingCategoryId);
            if (!originalCategory) return;
            const saved = await updateManagedPropertyDocumentCategory(editingCategoryId, { name });
            setCategories((current) => current.map((category) => (category.id === saved.id ? mapCategory(saved) : category)));
            setEditingCategoryId(null);
            setEditingCategoryName("");
            queueUndo("Updated", originalCategory.name, async () => {
                const restored = await updateManagedPropertyDocumentCategory(originalCategory.id, { name: originalCategory.name });
                setCategories((current) => current.map((category) => (category.id === restored.id ? mapCategory(restored) : category)));
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rename category");
        } finally {
            setSaving(false);
        }
    }

    async function deleteCategory(categoryId: string) {
        if (categories.length <= 1) return;

        const deletedCategory = categories.find((category) => category.id === categoryId);
        if (!deletedCategory) return;
        const affectedDocuments = documents.filter((document) => document.categoryId === categoryId);

        setError(null);
        setCategories((current) => current.filter((category) => category.id !== categoryId));
        setDocuments((current) => current.map((document) => (document.categoryId === categoryId ? { ...document, categoryId: null } : document)));
        if (categoryFilter === categoryId) setCategoryFilter("all");

        queueUndo(
            "Deleted",
            deletedCategory.name,
            async () => {
                setCategories((current) =>
                    current.some((category) => category.id === deletedCategory.id)
                        ? current
                        : [...current, deletedCategory].sort((a, b) => a.sortOrder - b.sortOrder),
                );
                const affectedIds = new Set(affectedDocuments.map((document) => document.id));
                setDocuments((current) =>
                    current.map((document) =>
                        affectedIds.has(document.id) ? { ...document, categoryId: deletedCategory.id } : document,
                    ),
                );
            },
            async () => {
                await deleteManagedPropertyDocumentCategory(categoryId);
            },
        );
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
                                Document cockpit · DB live
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                {projectLabel} Document Register
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Unit19ModalSwitcher activePanel="documents" onSwitchPanel={onSwitchPanel} incomeLabel="Budget" showRealEstate={propertySlug === "unit-19"} />
                            <button
                                type="button"
                                onClick={() => setEditingDocument(createBlankDocument(categories, nextOrder))}
                                disabled={!managedPropertyId || loading || saving}
                                className="rounded-[13px] border border-[#a68b4a]/[0.28] bg-[#a68b4a]/[0.10] px-4 py-2 text-[12px] font-semibold text-[#7a6228] transition hover:-translate-y-0.5 hover:border-[#a68b4a]/[0.42] hover:bg-[#a68b4a]/[0.16] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                Add document
                            </button>
                            <button
                                type="button"
                                onClick={() => void loadDocuments()}
                                disabled={loading || saving}
                                className="rounded-[13px] border border-[#ccd9e8] bg-white/[0.56] px-4 py-2 text-[12px] font-semibold text-[#4e6880] transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
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
                            <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Filters</div><button type="button" onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); setQuery(""); }} className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-2 py-1 text-[10px] font-semibold text-[#607993] transition hover:bg-white hover:text-[#0b1623]">Clear</button></div>
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
                                        placeholder="Search docs, KAEK, AADE..."
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] py-1.5 pl-8 pr-3 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Add category</div>
                            <div className="flex gap-2">
                                <input
                                    value={categoryDraft}
                                    onChange={(event) => setCategoryDraft(event.target.value)}
                                    placeholder="Category name"
                                    className="min-w-0 flex-1 rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed]"
                                />
                                <button
                                    type="button"
                                    onClick={() => void addCategory()}
                                    disabled={saving || !managedPropertyId}
                                    className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 text-[12px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88] disabled:opacity-45"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </aside>

                    <main className="min-h-0 overflow-hidden p-3.5">
                        {error ? (
                            <div className="mb-2 rounded-[14px] border border-[#d85b68]/[0.24] bg-[#d85b68]/[0.08] px-3 py-2 text-[12px] font-medium text-[#a73642]">
                                {error}
                            </div>
                        ) : null}

                        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[#7a90a8]">
                            <span>
                                {loading ? "Loading documents..." : `Showing ${filteredDocuments.length} of ${documents.length} DB records`}
                            </span>
                            <span>{saving ? "Saving..." : "DB live"}</span>
                        </div>

                        <div className="h-[calc(100%-32px)] overflow-hidden rounded-[18px] border border-white/[0.78] bg-white/[0.48] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="grid grid-cols-[52px_minmax(0,1.4fr)_160px_120px_120px] border-b border-[#d8e8f6]/[0.86] px-4 py-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#7a90a8]">
                                <div>#</div>
                                <div>Document</div>
                                <div>Category</div>
                                <div>Status</div>
                                <div>Actions</div>
                            </div>

                            <div className="h-[calc(100%-34px)] overflow-y-auto">
                                {filteredDocuments.map((document) => (
                                    <div
                                        key={document.id}
                                        ref={(node) => {
                                            documentRowRefs.current[document.id] = node;
                                        }}
                                        className="grid grid-cols-[52px_minmax(0,1.4fr)_160px_120px_120px] items-center border-b border-[#d8e8f6]/[0.72] px-4 py-2.5 text-[13px] transition hover:bg-white/[0.62]"
                                    >
                                        <div className="text-[#7a90a8]">#{document.order}</div>
                                        <button type="button" onClick={() => setEditingDocument(document)} className="min-w-0 text-left">
                                            <div className="truncate font-semibold text-[#0b1623]">{document.title}</div>
                                            <div className="mt-0.5 truncate text-[11.5px] text-[#7a90a8]">
                                                {document.fileName || document.source || document.proves || "No source"}
                                            </div>
                                        </button>
                                        <div className="truncate text-[#4e6880]">{categoryById.get(document.categoryId ?? "")?.name ?? "—"}</div>
                                        <div>
                                            <span className={`inline-flex rounded-full border px-2 py-1 text-[10.5px] font-semibold ${getStatusClasses(document.status)}`}>
                                                {statusLabels[document.status]}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setEditingDocument(document)}
                                                className="rounded-lg border border-[#ccd9e8] bg-white/[0.64] px-2 py-1 text-[11px] font-semibold text-[#4e6880] transition hover:bg-white"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void patchDocument(document.id, {
                                                        status: document.status === "available" ? "watchlist" : "available",
                                                    })
                                                }
                                                className="rounded-lg border border-[#ccd9e8] bg-white/[0.64] px-2 py-1 text-[11px] font-semibold text-[#4e6880] transition hover:bg-white"
                                            >
                                                {document.status === "available" ? "Watch" : "Done"}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {!loading && filteredDocuments.length === 0 ? (
                                    <div className="p-6 text-center text-[13px] text-[#7a90a8]">No documents match the current filters.</div>
                                ) : null}
                            </div>
                        </div>
                    </main>

                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-white/[0.65] bg-white/[0.36] p-3.5 lg:border-l lg:border-t-0">
                        <div className="rounded-[16px] border border-[#d85b68]/[0.18] bg-[#d85b68]/[0.055] p-3.5">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#a73642]">Critical open issues</div>
                            <div className="space-y-2">
                                {criticalOpenItems.map((document) => (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => setEditingDocument(document)}
                                        className="w-full rounded-xl border border-white/[0.72] bg-white/[0.48] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.76]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(document.status)}`}>
                                                {statusLabels[document.status]}
                                            </span>
                                            <span className="text-[10px] text-[#9ab0c4]">#{document.order}</span>
                                        </div>
                                        <div className="mt-1.5 text-[12.5px] font-semibold leading-5 text-[#0b1623]">{document.title}</div>
                                        {document.nextAction ? <div className="mt-1 text-[11.5px] leading-5 text-[#4e6880]">{document.nextAction}</div> : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Trace / weak evidence</div>
                            <div className="space-y-2">
                                {weakEvidenceItems.map((document) => (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => setEditingDocument(document)}
                                        className="w-full rounded-xl border border-white/[0.72] bg-white/[0.46] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.76]"
                                    >
                                        <div className="text-[12.5px] font-semibold text-[#0b1623]">{document.title}</div>
                                        <div className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-[#7a90a8]">
                                            {document.controlNote || document.proves || document.source}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Category actions</div>
                            {editingCategoryId ? (
                                <div className="space-y-2">
                                    <input
                                        value={editingCategoryName}
                                        onChange={(event) => setEditingCategoryName(event.target.value)}
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-2 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed]"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void renameCategory()}
                                            disabled={saving}
                                            className="rounded-xl border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#1560bc] disabled:opacity-45"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingCategoryId(null)}
                                            className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#4e6880]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {categories.map((category) => (
                                        <div key={category.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.54] bg-white/[0.34] px-2 py-1.5">
                                            <span className="min-w-0 truncate text-[12px] font-medium text-[#0b1623]">{category.name}</span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => startRenameCategory(category)}
                                                    className="text-[11px] font-semibold text-[#1560bc]"
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void deleteCategory(category.id)}
                                                    disabled={categories.length <= 1 || saving}
                                                    className="text-[11px] font-semibold text-[#a73642] disabled:opacity-35"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>

                {editingDocument ? (
                    <DocumentEditor
                        document={editingDocument}
                        categories={categories}
                        saving={saving}
                        uploading={uploadingDocumentId === editingDocument.id}
                        onChange={setEditingDocument}
                        onSave={() => void saveDocument()}
                        onCancel={() => setEditingDocument(null)}
                        onDelete={() => editingDocument.id ? void deleteDocument(editingDocument.id) : setEditingDocument(null)}
                        onUpload={(file) => void uploadDocumentFile(editingDocument, file)}
                        onOpenFile={() => void openDocumentFile(editingDocument)}
                        onRemoveFile={() => void removeDocumentFile(editingDocument)}
                    />
                ) : null}
            </div>
            <style>{`@keyframes shrinkUndo { from { width: 100%; } to { width: 0%; } }`}</style>
            {undoAction ? (
                <div className="fixed bottom-5 left-1/2 z-[9998] w-[320px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#d96969]/[0.26] bg-white/[0.92] p-3 shadow-[0_20px_70px_rgba(6,16,29,0.18)] backdrop-blur-2xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9d2f2f]">{undoAction.action}</div>
                    <div className="mt-1 text-[12px] text-[#607993]">{undoAction.label} {undoAction.action.toLowerCase()}. Undo available for 5 seconds.</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const pending = undoAction;
                                setUndoAction(null);
                                undoActionRef.current = null;
                                if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
                                void pending.restore().catch((restoreError: unknown) => {
                                    setError(restoreError instanceof Error ? restoreError.message : "Failed to undo document change");
                                });
                            }}
                            className="rounded-xl border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#2060cc] transition hover:bg-[#2f80ed]/[0.14]"
                        >
                            Undo
                        </button>
                        <span className="text-[10px] text-[#7a90a8]">auto-confirms</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#d96969]/[0.12]">
                        <div className="h-full rounded-full bg-[#d96969]/[0.56] animate-[shrinkUndo_5s_linear_forwards]" />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function KpiCard({
    label,
    value,
    detail,
    tone = "default",
}: {
    label: string;
    value: number;
    detail: string;
    tone?: "default" | "amber" | "blue" | "rose";
}) {
    const toneClass = {
        default: "border-white/[0.78] bg-white/[0.58] text-[#0b1623]",
        amber: "border-[#a68b4a]/[0.22] bg-[#a68b4a]/[0.08] text-[#0b1623]",
        blue: "border-[#2f80ed]/[0.20] bg-[#2f80ed]/[0.07] text-[#0b1623]",
        rose: "border-[#d85b68]/[0.20] bg-[#d85b68]/[0.07] text-[#0b1623]",
    }[tone];

    return (
        <div className={`rounded-[16px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] ${toneClass}`}>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#7a90a8]">{label}</div>
            <div className="mt-1 text-[22px] font-semibold tracking-tight">{value}</div>
            <div className="mt-0.5 text-[11px] text-[#7a90a8]">{detail}</div>
        </div>
    );
}

function DocumentEditor({
    document,
    categories,
    saving,
    uploading,
    onChange,
    onSave,
    onCancel,
    onDelete,
    onUpload,
    onOpenFile,
    onRemoveFile,
}: {
    document: DraftDocument;
    categories: UiCategory[];
    saving: boolean;
    uploading: boolean;
    onChange: (document: DraftDocument) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onUpload: (file: File) => void;
    onOpenFile: () => void;
    onRemoveFile: () => void;
}) {
    return (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-[#06101d]/[0.24] p-4 backdrop-blur-sm">
            <div className="flex max-h-[calc(100dvh-64px)] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/[0.78] bg-white/[0.88] shadow-[0_24px_90px_rgba(6,16,29,0.32)] backdrop-blur-2xl">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#d8e8f6]/[0.86] px-5 py-4">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">Document item</div>
                        <h3 className="mt-1 text-xl font-semibold text-[#0b1623]">{document.id ? "Edit document" : "Add document"}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#ccd9e8] bg-white/[0.62] text-[#6f849d] transition hover:-translate-y-0.5 hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
                    >
                        <IconClose />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Title">
                            <input
                                autoFocus={!document.id}
                                value={document.title}
                                onChange={(event) => onChange({ ...document, title: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Category">
                            <select
                                value={document.categoryId ?? ""}
                                onChange={(event) => onChange({ ...document, categoryId: event.target.value || null })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            >
                                <option value="">Uncategorized</option>
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
                                onChange={(event) => onChange({ ...document, status: event.target.value as ManagedPropertyDocumentStatus })}
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
                                onChange={(event) => onChange({ ...document, priority: event.target.value as ManagedPropertyDocumentPriority })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            >
                                {Object.entries(priorityLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="File">
                            <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] p-3">
                                {document.fileName ? (
                                    <div className="mb-2 min-w-0">
                                        <div className="truncate text-[12px] font-semibold text-[#0b1623]">{document.fileName}</div>
                                        <div className="truncate text-[10.5px] text-[#7a90a8]">{document.storagePath || "Attached file"}</div>
                                    </div>
                                ) : (
                                    <div className="mb-2 text-[12px] text-[#7a90a8]">
                                        {document.id ? "No file uploaded yet." : "Save the document first, then upload a file."}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    <label
                                        className={[
                                            "inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-[11.5px] font-semibold transition",
                                            document.id && !saving && !uploading
                                                ? "border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.10] text-[#1560bc] hover:bg-[#2f80ed]/[0.14]"
                                                : "pointer-events-none border-[#ccd9e8] bg-[#eef4fb] text-[#9aacbf]",
                                        ].join(" ")}
                                    >
                                        {uploading ? "Uploading..." : document.fileName ? "Replace file" : "Upload file"}
                                        <input
                                            type="file"
                                            className="hidden"
                                            disabled={!document.id || saving || uploading}
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                event.currentTarget.value = "";
                                                if (file) onUpload(file);
                                            }}
                                        />
                                    </label>

                                    {document.storagePath ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={onOpenFile}
                                                disabled={saving || uploading}
                                                className="rounded-xl border border-[#ccd9e8] bg-white/[0.74] px-3 py-2 text-[11.5px] font-semibold text-[#4e6880] transition hover:bg-white disabled:opacity-45"
                                            >
                                                Open file
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onRemoveFile}
                                                disabled={saving || uploading}
                                                className="rounded-xl border border-[#d85b68]/[0.24] bg-[#d85b68]/[0.07] px-3 py-2 text-[11.5px] font-semibold text-[#a73642] transition hover:bg-[#d85b68]/[0.10] disabled:opacity-45"
                                            >
                                                Remove file
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </Field>

                        <Field label="Source">
                            <input
                                value={document.source}
                                onChange={(event) => onChange({ ...document, source: event.target.value })}
                                className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Date">
                            <AdminDatePicker value={document.date} onChange={(date) => onChange({ ...document, date })} />
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
                                value={document.controlNote}
                                onChange={(event) => onChange({ ...document, controlNote: event.target.value })}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] leading-5 text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Next action">
                            <textarea
                                value={document.nextAction}
                                onChange={(event) => onChange({ ...document, nextAction: event.target.value })}
                                rows={2}
                                className="w-full resize-none rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] leading-5 text-[#0b1623] outline-none focus:border-[#2f80ed]"
                            />
                        </Field>

                        <Field label="Tags, comma-separated">
                            <input
                                value={document.tags.join(", ")}
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
                        disabled={saving}
                        className="rounded-xl border border-[#d85b68]/[0.24] bg-[#d85b68]/[0.07] px-4 py-2 text-[12px] font-semibold text-[#a73642] transition hover:bg-[#d85b68]/[0.10] disabled:opacity-45"
                    >
                        Delete
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={saving}
                            className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-4 py-2 text-[12px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88] disabled:opacity-45"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="rounded-xl border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.10] px-4 py-2 text-[12px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14] disabled:opacity-45"
                        >
                            {saving ? "Saving..." : "Save document"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.15em] text-[#7a90a8]">{label}</span>
            {children}
        </label>
    );
}
