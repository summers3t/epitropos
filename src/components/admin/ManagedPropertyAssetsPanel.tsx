"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import { useTimedUndoStack } from "@/components/admin/useTimedUndoStack";
import {
    createManagedPropertyAssetSignedUrls,
    createManagedPropertyInventoryItem,
    deleteManagedPropertyGalleryItem,
    deleteManagedPropertyInventoryAttachment,
    deleteManagedPropertyInventoryItem,
    getManagedPropertyAssets,
    setManagedPropertyGalleryCover,
    setManagedPropertyInventoryPrimaryPhoto,
    updateManagedPropertyGalleryItem,
    updateManagedPropertyInventoryItem,
    uploadManagedPropertyGalleryItem,
    uploadManagedPropertyInventoryAttachment,
    type ManagedPropertyAssetsBundle,
    type ManagedPropertyGalleryItem,
    type ManagedPropertyGalleryType,
    type ManagedPropertyInventoryAttachment,
    type ManagedPropertyInventoryAttachmentType,
    type ManagedPropertyInventoryCondition,
    type ManagedPropertyInventoryItem,
    type ManagedPropertyInventoryStatus,
} from "@/lib/admin/managedPropertiesApi";

export type ManagedPropertyAssetsSummary = {
    inventoryItems: number;
    galleryItems: number;
    activeWarranties: number;
    warrantyDocuments: number;
};

type Props = {
    managedPropertyId: string;
    section: "inventory" | "gallery";
    onSummaryChange?: (summary: ManagedPropertyAssetsSummary) => void;
};

type AssetUndoAction = "Deleted" | "Updated";

type QueueAssetUndo = (
    action: AssetUndoAction,
    label: string,
    restore: () => Promise<void>,
    commit?: () => Promise<void>,
) => void;

type SharedSectionProps = {
    managedPropertyId: string;
    bundle: ManagedPropertyAssetsBundle;
    signedUrls: Record<string, string>;
    saving: boolean;
    setSaving: (value: boolean) => void;
    setError: (value: string | null) => void;
    updateBundle: (
        updater: (current: ManagedPropertyAssetsBundle) => ManagedPropertyAssetsBundle,
    ) => void;
    queueUndo: QueueAssetUndo;
    reload: (preferredInventoryId?: string | null, preferredGalleryId?: string | null) => Promise<{
        next: ManagedPropertyAssetsBundle;
        preferredInventoryId?: string | null;
        preferredGalleryId?: string | null;
    } | null>;
};

type InventoryDraft = {
    name: string;
    category: string;
    room: string;
    condition: ManagedPropertyInventoryCondition;
    warranty_until: string;
    quantity: number;
    brand: string;
    model: string;
    serial_number: string;
    purchase_date: string;
    warranty_start_date: string;
    notes: string;
    status: ManagedPropertyInventoryStatus;
};

type GalleryDraft = {
    gallery_type: ManagedPropertyGalleryType;
    room_area: string;
    caption: string;
    photo_date: string;
};

type WarrantyTone = "active" | "soon" | "expired" | "none";

type Tone = "blue" | "green" | "gold" | "red" | "neutral";

const EMPTY_BUNDLE: ManagedPropertyAssetsBundle = {
    inventoryItems: [],
    inventoryAttachments: [],
    galleryItems: [],
};

const CATEGORY_OPTIONS = [
    { value: "furniture", label: "Furniture" },
    { value: "appliance", label: "Appliance" },
    { value: "electronics", label: "Electronics" },
    { value: "hvac", label: "Heating / cooling" },
    { value: "lighting", label: "Lighting" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
];

const CONDITION_OPTIONS: Array<{ value: ManagedPropertyInventoryCondition; label: string }> = [
    { value: "new", label: "New" },
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
    { value: "damaged", label: "Damaged" },
    { value: "unknown", label: "Unknown" },
];

const STATUS_OPTIONS: Array<{ value: ManagedPropertyInventoryStatus; label: string }> = [
    { value: "active", label: "Active" },
    { value: "removed", label: "Removed" },
    { value: "replaced", label: "Replaced" },
];

const ATTACHMENT_LABELS: Record<ManagedPropertyInventoryAttachmentType, string> = {
    photo: "Photo",
    warranty_card: "Warranty card",
    invoice: "Invoice",
    manual: "Manual",
    other: "Other document",
};

const BUTTON_BASE = "inline-flex items-center justify-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[10.5px] font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";
const BUTTON_BLUE = `${BUTTON_BASE} border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] text-[#1560bc] hover:-translate-y-0.5 hover:bg-[#2f80ed]/[0.14] hover:shadow-[0_10px_24px_rgba(47,128,237,0.10)]`;
const BUTTON_NEUTRAL = `${BUTTON_BASE} border-[#ccd9e8] bg-white/[0.64] text-[#607993] hover:-translate-y-0.5 hover:bg-white hover:text-[#0b1623]`;
const BUTTON_RED = `${BUTTON_BASE} border-[#d96969]/[0.24] bg-[#d96969]/[0.08] text-[#9d2f2f] hover:-translate-y-0.5 hover:bg-[#d96969]/[0.13]`;
const BUTTON_GREEN = `${BUTTON_BASE} border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448] hover:-translate-y-0.5 hover:bg-[#20a76b]/[0.14]`;
const BUTTON_GOLD = `${BUTTON_BASE} border-[#d6a92d]/[0.27] bg-[#d6a92d]/[0.09] text-[#8a6511] hover:-translate-y-0.5 hover:bg-[#d6a92d]/[0.15]`;

function blankToNull(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function inventoryToDraft(item: ManagedPropertyInventoryItem): InventoryDraft {
    return {
        name: item.name,
        category: item.category,
        room: item.room ?? "",
        condition: item.condition,
        warranty_until: item.warranty_until ?? "",
        quantity: Number(item.quantity || 1),
        brand: item.brand ?? "",
        model: item.model ?? "",
        serial_number: item.serial_number ?? "",
        purchase_date: item.purchase_date ?? "",
        warranty_start_date: item.warranty_start_date ?? "",
        notes: item.notes ?? "",
        status: item.status,
    };
}

function newInventoryDraft(): InventoryDraft {
    return {
        name: "",
        category: "other",
        room: "",
        condition: "unknown",
        warranty_until: "",
        quantity: 1,
        brand: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        warranty_start_date: "",
        notes: "",
        status: "active",
    };
}

function galleryToDraft(item: ManagedPropertyGalleryItem): GalleryDraft {
    return {
        gallery_type: item.gallery_type,
        room_area: item.room_area ?? "",
        caption: item.caption ?? "",
        photo_date: item.photo_date ?? "",
    };
}

function newGalleryDraft(): GalleryDraft {
    return {
        gallery_type: "interior",
        room_area: "",
        caption: "",
        photo_date: "",
    };
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}.${month}.${year}` : value;
}

function formatFileSize(value: number | null | undefined) {
    const bytes = Number(value ?? 0);
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getWarrantyState(value: string | null | undefined): { tone: WarrantyTone; label: string; shortLabel: string } {
    if (!value) return { tone: "none", label: "No warranty date", shortLabel: "No warranty" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(`${value}T00:00:00`);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);

    if (days < 0) return { tone: "expired", label: `Expired ${formatDate(value)}`, shortLabel: "Expired" };
    if (days <= 30) return { tone: "soon", label: `Expires in ${days} day${days === 1 ? "" : "s"}`, shortLabel: `${days}d left` };
    return { tone: "active", label: `In warranty until ${formatDate(value)}`, shortLabel: "In warranty" };
}

function warrantyClasses(tone: WarrantyTone) {
    if (tone === "active") return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.10] text-[#0f7448]";
    if (tone === "soon") return "border-[#d6a92d]/[0.28] bg-[#d6a92d]/[0.12] text-[#8a6511]";
    if (tone === "expired") return "border-[#d96969]/[0.28] bg-[#d96969]/[0.11] text-[#9d2f2f]";
    return "border-[#a9b8c8]/[0.26] bg-[#a9b8c8]/[0.10] text-[#607993]";
}

function toneClasses(tone: Tone) {
    if (tone === "blue") return "border-[#2f80ed]/[0.18] bg-[#2f80ed]/[0.07] text-[#1560bc]";
    if (tone === "green") return "border-[#20a76b]/[0.18] bg-[#20a76b]/[0.07] text-[#0f7448]";
    if (tone === "gold") return "border-[#d6a92d]/[0.21] bg-[#d6a92d]/[0.08] text-[#8a6511]";
    if (tone === "red") return "border-[#d96969]/[0.20] bg-[#d96969]/[0.08] text-[#9d2f2f]";
    return "border-white/[0.72] bg-white/[0.52] text-[#607993]";
}

function categoryLabel(category: string) {
    return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

function conditionLabel(condition: ManagedPropertyInventoryCondition) {
    return CONDITION_OPTIONS.find((option) => option.value === condition)?.label ?? condition;
}

function IconPlus() {
    return <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}

function IconSearch() {
    return <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>;
}

function IconChevron({ open }: { open: boolean }) {
    return <svg aria-hidden="true" className={["h-4 w-4 transition duration-200", open ? "rotate-180" : ""].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>;
}

function IconUpload() {
    return <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M5 14v5h14v-5" /></svg>;
}

function IconImage() {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3 2.5-2.5 5.5 5" /></svg>;
}

function IconBox() {
    return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m4 7.5 8-4 8 4-8 4-8-4Z" /><path d="m4 7.5 8 4 8-4M4 7.5v9l8 4 8-4v-9M12 11.5v9" /></svg>;
}

function IconFile() {
    return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /></svg>;
}

function IconShield() {
    return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.6 2.8 8.4 7 10 4.2-1.6 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

function IconGrip() {
    return <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="7" r="1.4" /><circle cx="16" cy="7" r="1.4" /><circle cx="8" cy="12" r="1.4" /><circle cx="16" cy="12" r="1.4" /><circle cx="8" cy="17" r="1.4" /><circle cx="16" cy="17" r="1.4" /></svg>;
}

function IconClose() {
    return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function IconArrow({ direction }: { direction: "left" | "right" }) {
    return <svg aria-hidden="true" className={direction === "left" ? "h-5 w-5" : "h-5 w-5 rotate-180"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}

function FieldLabel({ children }: { children: ReactNode }) {
    return <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{children}</span>;
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <label className="block">
            <FieldLabel>{label}</FieldLabel>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition duration-200 hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]"
            />
        </label>
    );
}

function SelectField<T extends string>({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <label className="block">
            <FieldLabel>{label}</FieldLabel>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value as T)}
                className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition duration-200 hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]"
            >
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>
    );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <div className="flex gap-1.5">
                <AdminDatePicker value={value} onChange={onChange} className="min-w-0 flex-1" />
                {value ? <button type="button" onClick={() => onChange("")} className={BUTTON_NEUTRAL}>Clear</button> : null}
            </div>
        </div>
    );
}

function WorkspaceShell({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[20px] border border-white/[0.80] bg-white/[0.58] p-4 shadow-[0_16px_46px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2f80ed]">{title}</div>
                    <div className="mt-1 max-w-3xl text-[12px] leading-relaxed text-[#7a90a8]">{subtitle}</div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function MetricCard({ label, value, helper, tone = "neutral" }: { label: string; value: string | number; helper: string; tone?: Tone }) {
    return (
        <div className={["rounded-[14px] border px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.018] hover:bg-white/[0.82] hover:shadow-[0_14px_32px_rgba(41,73,112,0.10)]", toneClasses(tone)].join(" ")}>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.14em] opacity-70">{label}</div>
            <div className="mt-1 text-[18px] font-semibold leading-none text-[#0b1623]">{value}</div>
            <div className="mt-1 text-[9.5px] text-[#7a90a8]">{helper}</div>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    text,
    action,
}: {
    icon: ReactNode;
    title: string;
    text: string;
    action?: ReactNode;
}) {
    return (
        <div className="mx-auto flex max-w-[520px] flex-col items-center rounded-[18px] border border-dashed border-[#b8c8da] bg-[linear-gradient(145deg,rgba(255,255,255,0.56),rgba(237,243,249,0.36))] px-6 py-9 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/[0.80] bg-white/[0.72] text-[#607993] shadow-[0_10px_26px_rgba(41,73,112,0.08)]">{icon}</div>
            <div className="mt-3 text-[13px] font-semibold text-[#0b1623]">{title}</div>
            <div className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-[#7a90a8]">{text}</div>
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

function CompactBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
    return <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[8.5px] font-semibold", toneClasses(tone)].join(" ")}>{children}</span>;
}

function AttachmentRow({
    attachment,
    signedUrl,
    onDelete,
}: {
    attachment: ManagedPropertyInventoryAttachment;
    signedUrl?: string;
    onDelete: () => void;
}) {
    return (
        <div className="group flex items-center gap-2 rounded-[12px] border border-[#d8e8f6]/80 bg-white/[0.56] px-2.5 py-2 transition duration-200 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.78] hover:shadow-[0_10px_24px_rgba(41,73,112,0.08)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-white/[0.82] bg-[#eef3f8] text-[#607993]">
                <IconFile />
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold text-[#0b1623]">{attachment.title || attachment.file_name}</div>
                <div className="mt-0.5 text-[8.5px] text-[#7a90a8]">{ATTACHMENT_LABELS[attachment.attachment_type]} · {formatFileSize(attachment.file_size_bytes)}</div>
            </div>
            <div className="flex gap-1.5 opacity-80 transition group-hover:opacity-100">
                {signedUrl ? <a href={signedUrl} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-[#1560bc] hover:underline">Open</a> : null}
                <button type="button" onClick={onDelete} className="text-[9px] font-semibold text-[#9d2f2f] hover:underline">Delete</button>
            </div>
        </div>
    );
}


type ViewerMediaItem = {
    id: string;
    url?: string;
    title: string;
    subtitle?: string;
    alt: string;
};

function BodyPortal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

function MediaViewer({
    items,
    activeId,
    onActiveChange,
    onClose,
    detailsOpen = false,
    detailsPanel,
    topActions,
    badges,
}: {
    items: ViewerMediaItem[];
    activeId: string;
    onActiveChange: (id: string) => void;
    onClose: () => void;
    detailsOpen?: boolean;
    detailsPanel?: ReactNode;
    topActions?: ReactNode;
    badges?: ReactNode;
}) {
    const activeIndex = items.findIndex((item) => item.id === activeId);
    const activeItem = activeIndex >= 0 ? items[activeIndex] : items[0] ?? null;

    const move = useCallback(
        (direction: -1 | 1) => {
            if (!activeItem || items.length < 2) return;
            const nextIndex = (activeIndex + direction + items.length) % items.length;
            onActiveChange(items[nextIndex].id);
        },
        [activeIndex, activeItem, items, onActiveChange],
    );

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            const editingField = target?.matches("input, textarea, select, [contenteditable='true']");

            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (editingField || items.length < 2) return;

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(-1);
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                move(1);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [items.length, move, onClose]);

    if (!activeItem) return null;

    return (
        <BodyPortal>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={activeItem.title}
                className="fixed inset-0 isolate overflow-hidden bg-[#050a12]"
                style={{ zIndex: 2147483000 }}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(84,124,170,0.22),transparent_42%),linear-gradient(180deg,rgba(4,9,16,0.90),rgba(3,7,13,0.98))]" />

                <div className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[0.10] bg-[#07101c]/[0.78] px-4 text-white backdrop-blur-xl sm:px-5">
                    <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold">{activeItem.title}</div>
                        <div className="mt-0.5 truncate text-[9.5px] text-white/[0.58]">
                            {activeItem.subtitle || `${Math.max(1, activeIndex + 1)} of ${items.length}`}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {topActions}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close viewer"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] text-white transition hover:scale-[1.04] hover:bg-white/[0.16] active:scale-[0.97]"
                        >
                            <IconClose />
                        </button>
                    </div>
                </div>

                <div
                    className={[
                        "relative z-10 flex h-full min-w-0 items-center justify-center px-3 pb-14 pt-16 transition-[padding] duration-300 sm:px-16",
                        detailsOpen ? "lg:pr-[430px]" : "",
                    ].join(" ")}
                >
                    {activeItem.url ? (
                        <img
                            src={activeItem.url}
                            alt={activeItem.alt}
                            className="max-h-[calc(100dvh-7.5rem)] max-w-full select-none object-contain drop-shadow-[0_26px_70px_rgba(0,0,0,0.42)]"
                            draggable={false}
                        />
                    ) : (
                        <div className="flex h-56 w-72 items-center justify-center rounded-[18px] border border-white/[0.12] bg-white/[0.05] text-[11px] text-white/[0.54]">
                            Preview unavailable
                        </div>
                    )}

                    {items.length > 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => move(-1)}
                                aria-label="Previous image"
                                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.18] bg-[#07101c]/[0.54] text-white shadow-[0_14px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:scale-[1.06] hover:bg-[#07101c]/[0.84] sm:left-5"
                            >
                                <IconArrow direction="left" />
                            </button>
                            <button
                                type="button"
                                onClick={() => move(1)}
                                aria-label="Next image"
                                className={[
                                    "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.18] bg-[#07101c]/[0.54] text-white shadow-[0_14px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:scale-[1.06] hover:bg-[#07101c]/[0.84]",
                                    detailsOpen ? "right-3 lg:right-[405px]" : "right-3 sm:right-5",
                                ].join(" ")}
                            >
                                <IconArrow direction="right" />
                            </button>
                        </>
                    ) : null}

                    <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-2 text-[9.5px] text-white/[0.62]">
                        <span>{Math.max(1, activeIndex + 1)} / {items.length}</span>
                        {badges}
                    </div>
                </div>

                {detailsOpen && detailsPanel ? (
                    <aside className="absolute bottom-0 right-0 top-16 z-40 flex w-full max-w-[390px] flex-col border-l border-white/[0.14] bg-white/[0.94] shadow-[-24px_0_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
                        {detailsPanel}
                    </aside>
                ) : null}
            </div>
        </BodyPortal>
    );
}

function inventoryItemPatch(item: ManagedPropertyInventoryItem) {
    return {
        name: item.name,
        category: item.category,
        room: item.room,
        condition: item.condition,
        warranty_until: item.warranty_until,
        quantity: item.quantity,
        brand: item.brand,
        model: item.model,
        serial_number: item.serial_number,
        purchase_date: item.purchase_date,
        warranty_start_date: item.warranty_start_date,
        notes: item.notes,
        status: item.status,
        sort_order: item.sort_order,
    };
}

function galleryItemPatch(item: ManagedPropertyGalleryItem) {
    return {
        gallery_type: item.gallery_type,
        room_area: item.room_area,
        caption: item.caption,
        photo_date: item.photo_date,
        is_cover: item.is_cover,
        sort_order: item.sort_order,
    };
}

function calculateSummary(bundle: ManagedPropertyAssetsBundle): ManagedPropertyAssetsSummary {
    return {
        inventoryItems: bundle.inventoryItems.length,
        galleryItems: bundle.galleryItems.length,
        activeWarranties: bundle.inventoryItems.filter((item) => { const tone = getWarrantyState(item.warranty_until).tone; return tone === "active" || tone === "soon"; }).length,
        warrantyDocuments: bundle.inventoryAttachments.filter((attachment) => attachment.attachment_type === "warranty_card").length,
    };
}

export default function ManagedPropertyAssetsPanel({ managedPropertyId, section, onSummaryChange }: Props) {
    const [bundle, setBundle] = useState<ManagedPropertyAssetsBundle>(EMPTY_BUNDLE);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bundleRef = useRef<ManagedPropertyAssetsBundle>(EMPTY_BUNDLE);
    const hasLoadedRef = useRef(false);
    const {
        current: undoAction,
        queueUndo: queueTimedUndo,
        undoLatest,
    } = useTimedUndoStack<AssetUndoAction>({
        onError: setError,
        commitErrorMessage: "Failed to finalize property asset change",
        restoreErrorMessage: "Failed to undo property asset change",
    });

    const updateBundle = useCallback(
        (updater: (current: ManagedPropertyAssetsBundle) => ManagedPropertyAssetsBundle) => {
            const next = updater(bundleRef.current);
            bundleRef.current = next;
            setBundle(next);
            onSummaryChange?.(calculateSummary(next));
        },
        [onSummaryChange],
    );

    const loadAssets = useCallback(
        async (preferredInventoryId?: string | null, preferredGalleryId?: string | null) => {
            if (!hasLoadedRef.current) setLoading(true);
            setError(null);
            try {
                const next = await getManagedPropertyAssets(managedPropertyId);
                bundleRef.current = next;
                setBundle(next);
                onSummaryChange?.(calculateSummary(next));
                const paths = [
                    ...next.inventoryAttachments.map((attachment) => attachment.storage_path),
                    ...next.galleryItems.map((item) => item.storage_path),
                ];
                setSignedUrls(await createManagedPropertyAssetSignedUrls(paths));
                return { next, preferredInventoryId, preferredGalleryId };
            } catch (currentError) {
                setError(currentError instanceof Error ? currentError.message : "Failed to load property assets");
                return null;
            } finally {
                hasLoadedRef.current = true;
                setLoading(false);
            }
        },
        [managedPropertyId, onSummaryChange],
    );

    const queueUndo = useCallback<QueueAssetUndo>(
        (action, label, restore, commit) => {
            queueTimedUndo({ action, label, restore, commit });
        },
        [queueTimedUndo],
    );

    useEffect(() => {
        hasLoadedRef.current = false;
        void loadAssets();
    }, [loadAssets]);

    if (loading) {
        return (
            <div className="rounded-[20px] border border-white/[0.80] bg-white/[0.58] p-4 shadow-[0_16px_46px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl">
                <div className="h-3 w-36 animate-pulse rounded-full bg-[#d9e3ee]" />
                <div className="mt-2 h-2.5 w-72 max-w-full animate-pulse rounded-full bg-[#e3eaf2]" />
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-[14px] border border-white/[0.74] bg-white/[0.46]" />)}
                </div>
                <div className="mt-3 h-28 animate-pulse rounded-[16px] border border-white/[0.74] bg-white/[0.42]" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {error ? (
                    <div className="rounded-[14px] border border-[#d96969]/[0.24] bg-[#d96969]/[0.08] px-3 py-2.5 text-[11.5px] font-semibold text-[#9d2f2f] shadow-[0_10px_28px_rgba(157,47,47,0.06)]">
                        {error}
                    </div>
                ) : null}

                {section === "inventory" ? (
                    <InventorySection
                        managedPropertyId={managedPropertyId}
                        bundle={bundle}
                        signedUrls={signedUrls}
                        saving={saving}
                        setSaving={setSaving}
                        setError={setError}
                        updateBundle={updateBundle}
                        queueUndo={queueUndo}
                        reload={loadAssets}
                    />
                ) : (
                    <GallerySection
                        managedPropertyId={managedPropertyId}
                        bundle={bundle}
                        signedUrls={signedUrls}
                        saving={saving}
                        setSaving={setSaving}
                        setError={setError}
                        updateBundle={updateBundle}
                        queueUndo={queueUndo}
                        reload={loadAssets}
                    />
                )}
            </div>

            <style>{`@keyframes shrinkUndo { from { width: 100%; } to { width: 0%; } }`}</style>
            {undoAction ? (
                <BodyPortal>
                    <div
                        key={undoAction.id}
                        className="fixed bottom-5 left-1/2 z-[9998] w-[320px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#d96969]/[0.26] bg-white/[0.92] p-3 shadow-[0_20px_70px_rgba(6,16,29,0.18)] backdrop-blur-2xl"
                    >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9d2f2f]">{undoAction.action}</div>
                        <div className="mt-1 text-[12px] text-[#607993]">
                            {undoAction.label} {undoAction.action.toLowerCase()}. Undo available for 5 seconds.
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => void undoLatest()}
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
                </BodyPortal>
            ) : null}
        </>
    );
}

function InventorySection({
    managedPropertyId,
    bundle,
    signedUrls,
    saving,
    setSaving,
    setError,
    updateBundle,
    queueUndo,
    reload,
}: SharedSectionProps) {
    const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
    const [draft, setDraft] = useState<InventoryDraft>(newInventoryDraft);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [extraAttachmentType, setExtraAttachmentType] = useState<ManagedPropertyInventoryAttachmentType>("invoice");
    const [viewerPhotoId, setViewerPhotoId] = useState<string | null>(null);
    const primaryPhotoInputRef = useRef<HTMLInputElement | null>(null);
    const warrantyInputRef = useRef<HTMLInputElement | null>(null);
    const extraAttachmentInputRef = useRef<HTMLInputElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!selectedId || selectedId === "new") return;
        const selected = bundle.inventoryItems.find((item) => item.id === selectedId);
        if (!selected) {
            setSelectedId(null);
            setDraft(newInventoryDraft());
            setViewerPhotoId(null);
            return;
        }
        setDraft(inventoryToDraft(selected));
    }, [bundle.inventoryItems, selectedId]);

    useEffect(() => {
        if (!searchOpen) return;
        const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [searchOpen]);

    const filteredItems = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return bundle.inventoryItems.filter((item) => {
            if (statusFilter === "active" && item.status !== "active") return false;
            if (!needle) return true;
            return [item.name, item.category, item.room, item.brand, item.model]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(needle));
        });
    }, [bundle.inventoryItems, search, statusFilter]);

    const selectedItem = selectedId && selectedId !== "new"
        ? bundle.inventoryItems.find((item) => item.id === selectedId) ?? null
        : null;

    const attachments = selectedItem
        ? bundle.inventoryAttachments.filter((attachment) => attachment.inventory_item_id === selectedItem.id)
        : [];
    const photos = attachments.filter((attachment) => attachment.attachment_type === "photo");
    const documents = attachments.filter((attachment) => attachment.attachment_type !== "photo");
    const warranty = getWarrantyState(draft.warranty_until);

    const activeItems = bundle.inventoryItems.filter((item) => item.status === "active").length;
    const rooms = new Set(bundle.inventoryItems.map((item) => item.room?.trim()).filter(Boolean)).size;
    const warrantyAttention = bundle.inventoryItems.filter((item) => {
        const tone = getWarrantyState(item.warranty_until).tone;
        return tone === "soon" || tone === "expired";
    }).length;
    const documentCount = bundle.inventoryAttachments.filter((attachment) => attachment.attachment_type !== "photo").length;

    const viewerItems = photos.map((attachment) => ({
        id: attachment.id,
        url: signedUrls[attachment.storage_path],
        title: selectedItem?.name ?? attachment.file_name,
        subtitle: `${attachment.is_primary ? "Primary photo · " : ""}${attachment.file_name}`,
        alt: selectedItem?.name ?? "Inventory photo",
    }));
    const viewerPhoto = photos.find((attachment) => attachment.id === viewerPhotoId) ?? null;

    function selectItem(item: ManagedPropertyInventoryItem) {
        if (selectedId === item.id) {
            setSelectedId(null);
            setShowAdvanced(false);
            setViewerPhotoId(null);
            return;
        }
        setSelectedId(item.id);
        setDraft(inventoryToDraft(item));
        setShowAdvanced(false);
        setViewerPhotoId(null);
        setError(null);
    }

    function startNewItem() {
        setSelectedId("new");
        setDraft(newInventoryDraft());
        setShowAdvanced(false);
        setViewerPhotoId(null);
        setError(null);
    }

    function cancelEditor() {
        setSelectedId(null);
        setDraft(newInventoryDraft());
        setShowAdvanced(false);
        setViewerPhotoId(null);
        setError(null);
    }

    async function saveItem() {
        if (!draft.name.trim()) {
            setError("Name is required.");
            return;
        }

        if (draft.warranty_start_date && draft.warranty_until && draft.warranty_start_date > draft.warranty_until) {
            setError("Warranty start date cannot be after warranty end date.");
            return;
        }

        const originalItem = selectedItem;
        const payload = {
            name: draft.name.trim(),
            category: draft.category,
            room: blankToNull(draft.room),
            condition: draft.condition,
            warranty_until: draft.warranty_until || null,
            quantity: Math.max(1, Number(draft.quantity || 1)),
            brand: blankToNull(draft.brand),
            model: blankToNull(draft.model),
            serial_number: blankToNull(draft.serial_number),
            purchase_date: draft.purchase_date || null,
            warranty_start_date: draft.warranty_start_date || null,
            notes: blankToNull(draft.notes),
            status: draft.status,
        };

        setSaving(true);
        setError(null);
        try {
            let saved: ManagedPropertyInventoryItem;
            if (selectedId === "new" || !originalItem) {
                const nextSortOrder = Math.max(0, ...bundle.inventoryItems.map((item) => item.sort_order)) + 10;
                saved = await createManagedPropertyInventoryItem({
                    managed_property_id: managedPropertyId,
                    ...payload,
                    sort_order: nextSortOrder,
                });
                updateBundle((current) => ({
                    ...current,
                    inventoryItems: [...current.inventoryItems, saved]
                        .sort((left, right) => left.sort_order - right.sort_order),
                }));
            } else {
                saved = await updateManagedPropertyInventoryItem(originalItem.id, payload);
                updateBundle((current) => ({
                    ...current,
                    inventoryItems: current.inventoryItems.map((item) => item.id === saved.id ? saved : item),
                }));

                queueUndo("Updated", originalItem.name, async () => {
                    const restored = await updateManagedPropertyInventoryItem(
                        originalItem.id,
                        inventoryItemPatch(originalItem),
                    );
                    updateBundle((current) => ({
                        ...current,
                        inventoryItems: current.inventoryItems.map((item) => item.id === restored.id ? restored : item),
                    }));
                });
            }

            setSelectedId(saved.id);
            setDraft(inventoryToDraft(saved));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save item");
        } finally {
            setSaving(false);
        }
    }

    function removeItem() {
        if (!selectedItem) return;

        const removedItem = selectedItem;
        const removedAttachments = bundle.inventoryAttachments.filter(
            (attachment) => attachment.inventory_item_id === removedItem.id,
        );

        updateBundle((current) => ({
            ...current,
            inventoryItems: current.inventoryItems.filter((item) => item.id !== removedItem.id),
            inventoryAttachments: current.inventoryAttachments.filter(
                (attachment) => attachment.inventory_item_id !== removedItem.id,
            ),
        }));
        setSelectedId(null);
        setDraft(newInventoryDraft());
        setViewerPhotoId(null);

        queueUndo(
            "Deleted",
            removedItem.name,
            async () => {
                updateBundle((current) => ({
                    ...current,
                    inventoryItems: current.inventoryItems.some((item) => item.id === removedItem.id)
                        ? current.inventoryItems
                        : [...current.inventoryItems, removedItem].sort((left, right) => left.sort_order - right.sort_order),
                    inventoryAttachments: [
                        ...current.inventoryAttachments.filter(
                            (attachment) => attachment.inventory_item_id !== removedItem.id,
                        ),
                        ...removedAttachments,
                    ].sort((left, right) => left.sort_order - right.sort_order),
                }));
            },
            async () => {
                await deleteManagedPropertyInventoryItem(removedItem.id);
            },
        );
    }

    async function uploadAttachment(
        file: File | null,
        attachmentType: ManagedPropertyInventoryAttachmentType,
        makePrimary = false,
    ) {
        if (!file || !selectedItem) return;

        setSaving(true);
        setError(null);
        try {
            await uploadManagedPropertyInventoryAttachment({
                managedPropertyId,
                inventoryItemId: selectedItem.id,
                attachmentType,
                file,
                makePrimary,
            });
            await reload(selectedItem.id, null);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to upload file");
        } finally {
            setSaving(false);
        }
    }

    async function makePrimary(attachment: ManagedPropertyInventoryAttachment) {
        const previousPrimary = photos.find((photo) => photo.is_primary) ?? null;
        if (previousPrimary?.id === attachment.id) return;

        setSaving(true);
        setError(null);
        try {
            await setManagedPropertyInventoryPrimaryPhoto(attachment.inventory_item_id, attachment.id);
            updateBundle((current) => ({
                ...current,
                inventoryAttachments: current.inventoryAttachments.map((currentAttachment) =>
                    currentAttachment.inventory_item_id === attachment.inventory_item_id
                    && currentAttachment.attachment_type === "photo"
                        ? { ...currentAttachment, is_primary: currentAttachment.id === attachment.id }
                        : currentAttachment,
                ),
            }));

            if (previousPrimary) {
                queueUndo("Updated", `${selectedItem?.name ?? "Inventory item"} primary photo`, async () => {
                    await setManagedPropertyInventoryPrimaryPhoto(
                        previousPrimary.inventory_item_id,
                        previousPrimary.id,
                    );
                    updateBundle((current) => ({
                        ...current,
                        inventoryAttachments: current.inventoryAttachments.map((currentAttachment) =>
                            currentAttachment.inventory_item_id === previousPrimary.inventory_item_id
                            && currentAttachment.attachment_type === "photo"
                                ? { ...currentAttachment, is_primary: currentAttachment.id === previousPrimary.id }
                                : currentAttachment,
                        ),
                    }));
                });
            }
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to set primary photo");
        } finally {
            setSaving(false);
        }
    }

    function removeAttachment(attachment: ManagedPropertyInventoryAttachment) {
        const itemAttachments = bundle.inventoryAttachments.filter(
            (currentAttachment) => currentAttachment.inventory_item_id === attachment.inventory_item_id,
        );
        const remainingPhotos = itemAttachments
            .filter((currentAttachment) =>
                currentAttachment.attachment_type === "photo" && currentAttachment.id !== attachment.id,
            )
            .sort((left, right) => left.sort_order - right.sort_order);
        const fallbackPrimaryId = attachment.is_primary ? remainingPhotos[0]?.id ?? null : null;

        updateBundle((current) => ({
            ...current,
            inventoryAttachments: current.inventoryAttachments
                .filter((currentAttachment) => currentAttachment.id !== attachment.id)
                .map((currentAttachment) =>
                    fallbackPrimaryId && currentAttachment.id === fallbackPrimaryId
                        ? { ...currentAttachment, is_primary: true }
                        : currentAttachment,
                ),
        }));
        if (viewerPhotoId === attachment.id) setViewerPhotoId(null);

        queueUndo(
            "Deleted",
            attachment.file_name,
            async () => {
                updateBundle((current) => ({
                    ...current,
                    inventoryAttachments: [
                        ...current.inventoryAttachments.filter(
                            (currentAttachment) => currentAttachment.inventory_item_id !== attachment.inventory_item_id,
                        ),
                        ...itemAttachments,
                    ].sort((left, right) => left.sort_order - right.sort_order),
                }));
            },
            async () => {
                await deleteManagedPropertyInventoryAttachment(attachment);
            },
        );
    }

    function renderEditor() {
        const isNew = selectedId === "new";
        const warrantyDocuments = documents.filter((attachment) => attachment.attachment_type === "warranty_card");
        const extraDocuments = documents.filter((attachment) => attachment.attachment_type !== "warranty_card");

        return (
            <div className="border-t border-white/[0.78] bg-white/[0.24] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{isNew ? "New item" : "Edit item"}</span>
                        <span className={["rounded-full border px-2 py-0.5 text-[8.5px] font-semibold", warrantyClasses(warranty.tone)].join(" ")}>{warranty.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {!isNew ? <button type="button" disabled={saving} onClick={removeItem} className={BUTTON_RED}>Delete</button> : null}
                        <button type="button" disabled={saving} onClick={cancelEditor} className={BUTTON_NEUTRAL}>Close</button>
                        <button type="button" disabled={saving} onClick={() => void saveItem()} className={BUTTON_BLUE}>{saving ? "Saving..." : isNew ? "Create item" : "Save changes"}</button>
                    </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="sm:col-span-2 xl:col-span-1">
                        <TextField label="Name *" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="e.g. Washing machine" />
                    </div>
                    <SelectField label="Category" value={draft.category} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} options={CATEGORY_OPTIONS} />
                    <TextField label="Room" value={draft.room} onChange={(value) => setDraft((current) => ({ ...current, room: value }))} placeholder="Kitchen, bedroom..." />
                    <SelectField label="Condition" value={draft.condition} onChange={(value) => setDraft((current) => ({ ...current, condition: value }))} options={CONDITION_OPTIONS} />
                    <DateField label="Warranty until" value={draft.warranty_until} onChange={(value) => setDraft((current) => ({ ...current, warranty_until: value }))} />
                </div>

                <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
                    <div className="rounded-[14px] border border-[#d8e8f6]/80 bg-white/[0.54] p-3 transition duration-200 hover:border-[#2f80ed]/[0.17] hover:bg-white/[0.68]">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-[10.5px] font-semibold text-[#0b1623]">Photos</div>
                                <div className="mt-0.5 text-[9px] text-[#7a90a8]">Compact thumbnails; click any image to open the viewer.</div>
                            </div>
                            <button
                                type="button"
                                disabled={!selectedItem || saving}
                                onClick={() => primaryPhotoInputRef.current?.click()}
                                className={BUTTON_BLUE}
                            >
                                <IconUpload /> Add photo
                            </button>
                        </div>

                        <div
                            className="mt-2.5 flex min-h-16 flex-wrap items-center gap-2 overflow-hidden"
                            style={{ maxHeight: photos.length > 0 ? 156 : undefined }}
                        >
                            {photos.length === 0 ? (
                                <div className="flex h-16 w-full items-center justify-center rounded-[12px] border border-dashed border-[#c4d1df] bg-white/[0.32] px-4 text-center text-[9.5px] text-[#7a90a8]">
                                    {selectedItem ? "No photos yet." : "Save the item first, then add photos."}
                                </div>
                            ) : photos.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="group relative shrink-0 overflow-hidden rounded-[10px] border border-white/[0.86] bg-[#eef3f8] shadow-[0_7px_18px_rgba(41,73,112,0.09)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(41,73,112,0.14)]"
                                    style={{ width: 82, height: 62 }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setViewerPhotoId(attachment.id)}
                                        className="block h-full w-full overflow-hidden"
                                        style={{ width: 82, height: 62 }}
                                        aria-label={`Open ${attachment.file_name}`}
                                    >
                                        {signedUrls[attachment.storage_path] ? (
                                            <img
                                                src={signedUrls[attachment.storage_path]}
                                                alt=""
                                                className="block"
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center text-[#91a4b8]"><IconImage /></span>
                                        )}
                                    </button>
                                    {attachment.is_primary ? (
                                        <span className="pointer-events-none absolute left-1 top-1 rounded-full border border-white/[0.58] bg-[#07111f]/[0.66] px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.06em] text-white backdrop-blur-md">
                                            Primary
                                        </span>
                                    ) : null}
                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#06101d]/[0.72] px-1.5 py-1 text-[7px] text-white opacity-0 transition group-hover:opacity-100">
                                        {!attachment.is_primary ? (
                                            <button type="button" onClick={() => void makePrimary(attachment)} className="font-semibold hover:underline">Primary</button>
                                        ) : <span />}
                                        <button type="button" onClick={() => removeAttachment(attachment)} className="font-semibold hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <input
                            ref={primaryPhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="hidden"
                            onChange={(event) => {
                                void uploadAttachment(
                                    event.target.files?.[0] ?? null,
                                    "photo",
                                    photos.length === 0,
                                );
                                event.currentTarget.value = "";
                            }}
                        />
                    </div>

                    <div className="rounded-[14px] border border-[#d8e8f6]/80 bg-white/[0.54] p-3 transition duration-200 hover:border-[#20a76b]/[0.17] hover:bg-white/[0.68]">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#0b1623]"><IconShield /> Warranty documents</div>
                                <div className="mt-0.5 text-[9px] text-[#7a90a8]">Private image or PDF archive.</div>
                            </div>
                            <button type="button" disabled={!selectedItem || saving} onClick={() => warrantyInputRef.current?.click()} className={BUTTON_GREEN}><IconUpload /> Upload</button>
                        </div>
                        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                            {warrantyDocuments.length === 0 ? (
                                <div className="sm:col-span-2 flex h-16 items-center justify-center rounded-[12px] border border-dashed border-[#c4d1df] bg-white/[0.34] px-4 text-center text-[9.5px] text-[#7a90a8]">{selectedItem ? "No warranty document uploaded." : "Save the item first, then attach documents."}</div>
                            ) : warrantyDocuments.map((attachment) => (
                                <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => removeAttachment(attachment)} />
                            ))}
                        </div>
                        <input ref={warrantyInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, "warranty_card"); event.currentTarget.value = ""; }} />
                    </div>
                </div>

                <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-[13px] border border-[#d8e8f6]/80 bg-white/[0.46] px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.70] hover:shadow-[0_10px_24px_rgba(41,73,112,0.08)]">
                    <div>
                        <div className="text-[10.5px] font-semibold text-[#0b1623]">Advanced details</div>
                        <div className="mt-0.5 text-[9px] text-[#7a90a8]">Brand, model, serial number, purchase history, lifecycle and supporting files.</div>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.70] text-[#607993]"><IconChevron open={showAdvanced} /></span>
                </button>

                {showAdvanced ? (
                    <div className="mt-2.5 rounded-[14px] border border-[#d8e8f6]/80 bg-white/[0.42] p-3">
                        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                            <TextField label="Quantity" type="number" value={draft.quantity} onChange={(value) => setDraft((current) => ({ ...current, quantity: Math.max(1, Number(value || 1)) }))} />
                            <TextField label="Brand" value={draft.brand} onChange={(value) => setDraft((current) => ({ ...current, brand: value }))} />
                            <TextField label="Model" value={draft.model} onChange={(value) => setDraft((current) => ({ ...current, model: value }))} />
                            <TextField label="Serial number" value={draft.serial_number} onChange={(value) => setDraft((current) => ({ ...current, serial_number: value }))} />
                            <DateField label="Purchase date" value={draft.purchase_date} onChange={(value) => setDraft((current) => ({ ...current, purchase_date: value }))} />
                            <DateField label="Warranty start" value={draft.warranty_start_date} onChange={(value) => setDraft((current) => ({ ...current, warranty_start_date: value }))} />
                            <SelectField label="Lifecycle status" value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={STATUS_OPTIONS} />
                            <div className="sm:col-span-2 xl:col-span-4">
                                <label className="block"><FieldLabel>Notes</FieldLabel><textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] leading-relaxed text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]" /></label>
                            </div>
                        </div>

                        <div className="mt-3 border-t border-[#dbe4ee] pt-3">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">Supporting files</div>
                                    <div className="mt-0.5 text-[9px] text-[#7a90a8]">Invoices, manuals and other reference documents.</div>
                                </div>
                                <div className="flex items-end gap-1.5">
                                    <select value={extraAttachmentType} onChange={(event) => setExtraAttachmentType(event.target.value as ManagedPropertyInventoryAttachmentType)} className="h-8 rounded-[10px] border border-[#ccd9e8] bg-white/[0.72] px-2.5 text-[10px] font-semibold text-[#607993] outline-none">
                                        {(["invoice", "manual", "other"] as const).map((type) => <option key={type} value={type}>{ATTACHMENT_LABELS[type]}</option>)}
                                    </select>
                                    <button type="button" disabled={!selectedItem || saving} onClick={() => extraAttachmentInputRef.current?.click()} className={BUTTON_NEUTRAL}><IconUpload /> Add file</button>
                                </div>
                            </div>
                            <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                                {extraDocuments.length === 0 ? <div className="sm:col-span-2 xl:col-span-3 rounded-[11px] border border-dashed border-[#c4d1df] bg-white/[0.30] px-3 py-3 text-center text-[9.5px] text-[#7a90a8]">No additional files.</div> : extraDocuments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => removeAttachment(attachment)} />)}
                            </div>
                            <input ref={extraAttachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, extraAttachmentType); event.currentTarget.value = ""; }} />
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    const noItems = bundle.inventoryItems.length === 0;
    const noMatches = !noItems && filteredItems.length === 0;

    return (
        <>
            <WorkspaceShell
                title="Furniture & Appliances"
                subtitle="A compact operational inventory with photos, warranty status and supporting documents. Open only the item you need; detailed fields stay tucked away until required."
                action={<button type="button" onClick={startNewItem} disabled={saving} className={BUTTON_BLUE}><IconPlus /> Add item</button>}
            >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Active inventory" value={activeItems} helper={`${bundle.inventoryItems.length} total items`} tone="blue" />
                    <MetricCard label="Rooms covered" value={rooms} helper="unique locations" tone="neutral" />
                    <MetricCard label="Warranty attention" value={warrantyAttention} helper="expired or ≤ 30 days" tone={warrantyAttention > 0 ? "gold" : "green"} />
                    <MetricCard label="Documents" value={documentCount} helper="warranty, invoice and manuals" tone="neutral" />
                </div>

                {!noItems ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-white/[0.72] bg-white/[0.40] px-2.5 py-2">
                        <div className="inline-flex rounded-[10px] border border-[#ccd9e8] bg-white/[0.54] p-1">
                            {(["active", "all"] as const).map((value) => (
                                <button key={value} type="button" onClick={() => setStatusFilter(value)} className={["rounded-[7px] px-2.5 py-1 text-[9px] font-semibold capitalize transition", statusFilter === value ? "bg-[#2f80ed]/[0.12] text-[#1560bc] shadow-[0_4px_12px_rgba(47,128,237,0.08)]" : "text-[#7a90a8] hover:bg-white/[0.72] hover:text-[#0b1623]"].join(" ")}>{value}</button>
                            ))}
                        </div>

                        <div className="flex min-w-0 items-center justify-end gap-2">
                            {searchOpen || search ? (
                                <div className="flex w-[min(250px,62vw)] items-center gap-1 rounded-[10px] border border-[#ccd9e8] bg-white/[0.72] px-2 transition focus-within:border-[#2f80ed]/50 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]">
                                    <input
                                        ref={searchInputRef}
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search inventory"
                                        className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[10.5px] text-[#0b1623] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setSearch(""); setSearchOpen(false); }}
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#7a90a8] transition hover:bg-[#eef3f8] hover:text-[#0b1623]"
                                        aria-label="Close search"
                                    >
                                        <IconClose />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    aria-label="Search inventory"
                                    title="Search inventory"
                                    className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#ccd9e8] bg-white/[0.62] text-[#607993] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#1560bc]"
                                >
                                    <IconSearch />
                                </button>
                            )}
                            <span className="whitespace-nowrap text-[9px] font-semibold text-[#7a90a8]">{filteredItems.length} shown</span>
                        </div>
                    </div>
                ) : null}

                <div className="mt-3 space-y-2">
                    {selectedId === "new" ? (
                        <div className="overflow-hidden rounded-[16px] border border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.055] shadow-[0_14px_34px_rgba(47,128,237,0.09)]">
                            <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] border border-white/[0.82] bg-white/[0.72] text-[#607993] shadow-[0_8px_20px_rgba(41,73,112,0.08)]"><IconBox /></div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[12px] font-semibold text-[#0b1623]">New inventory item</div>
                                    <div className="mt-0.5 text-[9.5px] text-[#7a90a8]">Enter the essentials first. Photos and files unlock after the initial save.</div>
                                </div>
                                <CompactBadge tone="blue">Draft</CompactBadge>
                            </div>
                            {renderEditor()}
                        </div>
                    ) : null}

                    {noItems && selectedId !== "new" ? (
                        <EmptyState icon={<IconBox />} title="No inventory yet" text="Start with the main appliances and furniture. Only the item name is required; everything else can be added later." action={<button type="button" onClick={startNewItem} className={BUTTON_BLUE}><IconPlus /> Add first item</button>} />
                    ) : null}

                    {noMatches ? (
                        <EmptyState icon={<IconSearch />} title="No matching items" text="Change the search phrase or show all lifecycle states." action={<div className="flex gap-2"><button type="button" onClick={() => { setSearch(""); setSearchOpen(false); }} className={BUTTON_NEUTRAL}>Clear search</button><button type="button" onClick={() => setStatusFilter("all")} className={BUTTON_BLUE}>Show all</button></div>} />
                    ) : null}

                    {filteredItems.map((item) => {
                        const expanded = item.id === selectedId;
                        const itemAttachments = bundle.inventoryAttachments.filter((attachment) => attachment.inventory_item_id === item.id);
                        const itemPhoto = itemAttachments.find((attachment) => attachment.attachment_type === "photo" && attachment.is_primary)
                            ?? itemAttachments.find((attachment) => attachment.attachment_type === "photo")
                            ?? null;
                        const itemWarranty = getWarrantyState(item.warranty_until);
                        const itemDocumentCount = itemAttachments.filter((attachment) => attachment.attachment_type !== "photo").length;

                        return (
                            <div key={item.id} className={["overflow-hidden rounded-[16px] border transition duration-200", expanded ? "border-[#2f80ed]/[0.28] bg-white/[0.70] shadow-[0_16px_38px_rgba(47,128,237,0.10)]" : "border-[#d8e8f6]/80 bg-white/[0.55] hover:-translate-y-0.5 hover:scale-[1.004] hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.74] hover:shadow-[0_16px_36px_rgba(41,73,112,0.10)]"].join(" ")}>
                                <button type="button" onClick={() => selectItem(item)} className="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4">
                                    <div
                                        className="shrink-0 overflow-hidden rounded-[12px] border border-white/[0.84] bg-[#eef3f8] shadow-[0_8px_20px_rgba(41,73,112,0.08)]"
                                        style={{ width: 64, height: 56 }}
                                    >
                                        {itemPhoto && signedUrls[itemPhoto.storage_path] ? (
                                            <img
                                                src={signedUrls[itemPhoto.storage_path]}
                                                alt=""
                                                className="block transition duration-300 group-hover:scale-[1.03]"
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[#91a4b8]"><IconBox /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="truncate text-[12px] font-semibold text-[#0b1623]">{item.name}</span>
                                            <CompactBadge tone="neutral">{categoryLabel(item.category)}</CompactBadge>
                                            {item.status !== "active" ? <CompactBadge tone="gold">{item.status}</CompactBadge> : null}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-[#7a90a8]">
                                            <span>{item.room || "No room"}</span>
                                            <span>{conditionLabel(item.condition)}</span>
                                            {item.brand ? <span>{item.brand}{item.model ? ` · ${item.model}` : ""}</span> : null}
                                        </div>
                                    </div>
                                    <div className="hidden min-w-[150px] flex-col items-end gap-1.5 sm:flex">
                                        <span className={["rounded-full border px-2.5 py-1 text-[9px] font-semibold", warrantyClasses(itemWarranty.tone)].join(" ")}>{itemWarranty.shortLabel}</span>
                                        <span className="text-[8.5px] text-[#7a90a8]">{itemAttachments.length} file{itemAttachments.length === 1 ? "" : "s"} · {itemDocumentCount} document{itemDocumentCount === 1 ? "" : "s"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="hidden text-[9.5px] font-semibold text-[#7a90a8] sm:block">{expanded ? "Collapse" : "Open"}</span>
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] shadow-[0_6px_16px_rgba(41,73,112,0.06)]"><IconChevron open={expanded} /></span>
                                    </div>
                                </button>
                                {expanded ? renderEditor() : null}
                            </div>
                        );
                    })}
                </div>
            </WorkspaceShell>

            {viewerPhoto && viewerItems.length > 0 ? (
                <MediaViewer
                    items={viewerItems}
                    activeId={viewerPhoto.id}
                    onActiveChange={setViewerPhotoId}
                    onClose={() => setViewerPhotoId(null)}
                    badges={viewerPhoto.is_primary ? <span className="rounded-full border border-white/[0.20] bg-white/[0.08] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white">Primary</span> : null}
                />
            ) : null}
        </>
    );
}

function GallerySection({
    managedPropertyId,
    bundle,
    signedUrls,
    saving,
    setSaving,
    setError,
    updateBundle,
    queueUndo,
    reload,
}: SharedSectionProps) {
    const [filter, setFilter] = useState<"all" | ManagedPropertyGalleryType>("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<GalleryDraft>(newGalleryDraft);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const [uploadDraft, setUploadDraft] = useState<GalleryDraft>(newGalleryDraft);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropActive, setDropActive] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    const filteredItems = useMemo(
        () => filter === "all"
            ? [...bundle.galleryItems].sort((left, right) => left.sort_order - right.sort_order)
            : bundle.galleryItems
                .filter((item) => item.gallery_type === filter)
                .sort((left, right) => left.sort_order - right.sort_order),
        [bundle.galleryItems, filter],
    );
    const selectedItem = bundle.galleryItems.find((item) => item.id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedId) return;
        const selected = bundle.galleryItems.find((item) => item.id === selectedId);
        if (!selected) {
            setSelectedId(null);
            setDetailsOpen(false);
            setDraft(newGalleryDraft());
            return;
        }
        setDraft(galleryToDraft(selected));
    }, [bundle.galleryItems, selectedId]);

    const interiorCount = bundle.galleryItems.filter((item) => item.gallery_type === "interior").length;
    const exteriorCount = bundle.galleryItems.filter((item) => item.gallery_type === "exterior").length;
    const roomCount = new Set(bundle.galleryItems.map((item) => item.room_area?.trim()).filter(Boolean)).size;

    const viewerItems = filteredItems.map((item) => ({
        id: item.id,
        url: signedUrls[item.storage_path],
        title: item.caption || item.room_area || item.file_name,
        subtitle: `${item.file_name} · ${formatFileSize(item.file_size_bytes)}`,
        alt: item.caption || item.room_area || "Property photo",
    }));

    function selectGalleryItem(item: ManagedPropertyGalleryItem) {
        setSelectedId(item.id);
        setDraft(galleryToDraft(item));
        setDetailsOpen(false);
        setError(null);
    }

    function changeViewerSelection(id: string) {
        const next = bundle.galleryItems.find((item) => item.id === id);
        if (!next) return;
        setSelectedId(next.id);
        setDraft(galleryToDraft(next));
    }

    function closeViewer() {
        setSelectedId(null);
        setDetailsOpen(false);
        setDraft(newGalleryDraft());
    }

    function addUploadFiles(files: File[]) {
        const images = files.filter((file) => file.type.startsWith("image/"));
        setUploadFiles((current) => {
            const seen = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const next = [...current];
            for (const file of images) {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                if (!seen.has(key)) {
                    next.push(file);
                    seen.add(key);
                }
            }
            return next;
        });
    }

    async function uploadPhotos() {
        if (uploadFiles.length === 0) {
            setError("Choose at least one image.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            let sortOrder = Math.max(0, ...bundle.galleryItems.map((item) => item.sort_order)) + 10;
            let firstCreatedId: string | null = null;
            const shouldCreateCover = !bundle.galleryItems.some((item) => item.is_cover);

            for (const [index, file] of uploadFiles.entries()) {
                const created = await uploadManagedPropertyGalleryItem({
                    managedPropertyId,
                    galleryType: uploadDraft.gallery_type,
                    roomArea: blankToNull(uploadDraft.room_area),
                    caption: blankToNull(uploadDraft.caption),
                    photoDate: uploadDraft.photo_date || null,
                    file,
                    makeCover: shouldCreateCover && index === 0,
                    sortOrder,
                });
                if (!firstCreatedId) firstCreatedId = created.id;
                sortOrder += 10;
            }

            setShowUploader(false);
            setUploadFiles([]);
            setUploadDraft(newGalleryDraft());
            await reload(null, firstCreatedId);
            setSelectedId(null);
            setDraft(newGalleryDraft());
            setDetailsOpen(false);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to upload gallery photos");
        } finally {
            setSaving(false);
        }
    }

    async function saveGalleryItem() {
        if (!selectedItem) return;
        const originalItem = selectedItem;

        setSaving(true);
        setError(null);
        try {
            const saved = await updateManagedPropertyGalleryItem(selectedItem.id, {
                gallery_type: draft.gallery_type,
                room_area: blankToNull(draft.room_area),
                caption: blankToNull(draft.caption),
                photo_date: draft.photo_date || null,
            });

            updateBundle((current) => ({
                ...current,
                galleryItems: current.galleryItems.map((item) => item.id === saved.id ? saved : item),
            }));
            setDraft(galleryToDraft(saved));
            if (filter !== "all" && saved.gallery_type !== filter) setFilter("all");

            queueUndo("Updated", originalItem.file_name, async () => {
                const restored = await updateManagedPropertyGalleryItem(
                    originalItem.id,
                    galleryItemPatch(originalItem),
                );
                updateBundle((current) => ({
                    ...current,
                    galleryItems: current.galleryItems.map((item) => item.id === restored.id ? restored : item),
                }));
            });
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save gallery photo");
        } finally {
            setSaving(false);
        }
    }

    async function makeCover(item: ManagedPropertyGalleryItem) {
        const previousCover = bundle.galleryItems.find((currentItem) => currentItem.is_cover) ?? null;
        if (previousCover?.id === item.id) return;

        setSaving(true);
        setError(null);
        try {
            await setManagedPropertyGalleryCover(managedPropertyId, item.id);
            updateBundle((current) => ({
                ...current,
                galleryItems: current.galleryItems.map((currentItem) => ({
                    ...currentItem,
                    is_cover: currentItem.id === item.id,
                })),
            }));

            if (previousCover) {
                queueUndo("Updated", "Gallery cover", async () => {
                    await setManagedPropertyGalleryCover(managedPropertyId, previousCover.id);
                    updateBundle((current) => ({
                        ...current,
                        galleryItems: current.galleryItems.map((currentItem) => ({
                            ...currentItem,
                            is_cover: currentItem.id === previousCover.id,
                        })),
                    }));
                });
            }
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to set cover photo");
        } finally {
            setSaving(false);
        }
    }

    function removeGalleryItem(item: ManagedPropertyGalleryItem) {
        const originalItems = [...bundle.galleryItems];
        const remaining = originalItems
            .filter((currentItem) => currentItem.id !== item.id)
            .sort((left, right) => left.sort_order - right.sort_order);
        const fallbackCoverId = item.is_cover ? remaining[0]?.id ?? null : null;

        updateBundle((current) => ({
            ...current,
            galleryItems: current.galleryItems
                .filter((currentItem) => currentItem.id !== item.id)
                .map((currentItem) =>
                    fallbackCoverId && currentItem.id === fallbackCoverId
                        ? { ...currentItem, is_cover: true }
                        : currentItem,
                ),
        }));
        closeViewer();

        queueUndo(
            "Deleted",
            item.file_name,
            async () => {
                const originalIds = new Set(originalItems.map((originalItem) => originalItem.id));
                updateBundle((current) => ({
                    ...current,
                    galleryItems: [
                        ...originalItems,
                        ...current.galleryItems.filter((currentItem) => !originalIds.has(currentItem.id)),
                    ].sort((left, right) => left.sort_order - right.sort_order),
                }));
            },
            async () => {
                await deleteManagedPropertyGalleryItem(item);
            },
        );
    }

    async function reorderGallery(draggedItemId: string, targetItemId: string) {
        if (draggedItemId === targetItemId) return;

        const originalOrder = [...bundle.galleryItems]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((item) => ({ id: item.id, sort_order: item.sort_order }));
        const ordered = [...bundle.galleryItems].sort((left, right) => left.sort_order - right.sort_order);
        const from = ordered.findIndex((item) => item.id === draggedItemId);
        const to = ordered.findIndex((item) => item.id === targetItemId);
        if (from < 0 || to < 0) return;

        const next = [...ordered];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const reordered = next.map((item, index) => ({ ...item, sort_order: (index + 1) * 10 }));

        updateBundle((current) => ({
            ...current,
            galleryItems: reordered,
        }));
        setSaving(true);
        setError(null);

        try {
            await Promise.all(
                reordered.map((item) =>
                    updateManagedPropertyGalleryItem(item.id, { sort_order: item.sort_order }),
                ),
            );

            queueUndo("Updated", "Gallery order", async () => {
                await Promise.all(
                    originalOrder.map((item) =>
                        updateManagedPropertyGalleryItem(item.id, { sort_order: item.sort_order }),
                    ),
                );
                const orderMap = new Map(originalOrder.map((item) => [item.id, item.sort_order]));
                updateBundle((current) => ({
                    ...current,
                    galleryItems: current.galleryItems
                        .map((item) => ({
                            ...item,
                            sort_order: orderMap.get(item.id) ?? item.sort_order,
                        }))
                        .sort((left, right) => left.sort_order - right.sort_order),
                }));
            });
        } catch (currentError) {
            const orderMap = new Map(originalOrder.map((item) => [item.id, item.sort_order]));
            updateBundle((current) => ({
                ...current,
                galleryItems: current.galleryItems
                    .map((item) => ({
                        ...item,
                        sort_order: orderMap.get(item.id) ?? item.sort_order,
                    }))
                    .sort((left, right) => left.sort_order - right.sort_order),
            }));
            setError(currentError instanceof Error ? currentError.message : "Failed to reorder gallery");
        } finally {
            setSaving(false);
            setDraggedId(null);
        }
    }

    const detailsPanel = selectedItem ? (
        <>
            <div className="flex items-start justify-between gap-3 border-b border-[#dce5ef] px-4 py-3.5">
                <div className="min-w-0">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#2f80ed]">Photo details</div>
                    <div className="mt-1 truncate text-[12px] font-semibold text-[#0b1623]">{selectedItem.file_name}</div>
                    <div className="mt-0.5 text-[8.5px] text-[#7a90a8]">{formatFileSize(selectedItem.file_size_bytes)}</div>
                </div>
                <button type="button" onClick={() => setDetailsOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] transition hover:bg-white hover:text-[#0b1623]" aria-label="Close details"><IconClose /></button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
                <SelectField label="Type" value={draft.gallery_type} onChange={(value) => setDraft((current) => ({ ...current, gallery_type: value }))} options={[{ value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" }]} />
                <TextField label="Room / area" value={draft.room_area} onChange={(value) => setDraft((current) => ({ ...current, room_area: value }))} placeholder="Living room, facade..." />
                <DateField label="Photo date" value={draft.photo_date} onChange={(value) => setDraft((current) => ({ ...current, photo_date: value }))} />
                <label className="block">
                    <FieldLabel>Caption</FieldLabel>
                    <textarea value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} rows={4} className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] leading-relaxed text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]" />
                </label>
                <div className="rounded-[13px] border border-[#dce5ef] bg-white/[0.64] p-3">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">File metadata</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px]">
                        <div><div className="text-[#7a90a8]">Uploaded</div><div className="mt-0.5 font-semibold text-[#0b1623]">{formatDate(selectedItem.created_at?.slice(0, 10))}</div></div>
                        <div><div className="text-[#7a90a8]">Photo date</div><div className="mt-0.5 font-semibold text-[#0b1623]">{formatDate(selectedItem.photo_date)}</div></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dce5ef] bg-white/[0.66] px-4 py-3">
                <div className="flex gap-1.5">
                    <button type="button" disabled={saving} onClick={() => removeGalleryItem(selectedItem)} className={BUTTON_RED}>Delete</button>
                    {signedUrls[selectedItem.storage_path] ? <a href={signedUrls[selectedItem.storage_path]} target="_blank" rel="noreferrer" className={BUTTON_NEUTRAL}>Open original</a> : null}
                </div>
                <div className="flex gap-1.5">
                    {!selectedItem.is_cover ? <button type="button" disabled={saving} onClick={() => void makeCover(selectedItem)} className={BUTTON_GOLD}>Set cover</button> : null}
                    <button type="button" disabled={saving} onClick={() => void saveGalleryItem()} className={BUTTON_BLUE}>{saving ? "Saving..." : "Save"}</button>
                </div>
            </div>
        </>
    ) : null;

    return (
        <>
            <WorkspaceShell
                title="Gallery"
                subtitle="A clean interior and exterior archive. Browse from the grid, open a focused viewer only when needed, and drag thumbnails to refine the visual order."
                action={<button type="button" disabled={saving} onClick={() => setShowUploader((value) => !value)} className={BUTTON_BLUE}>{showUploader ? <IconClose /> : <IconPlus />}{showUploader ? "Close upload" : "Add photos"}</button>}
            >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Total photos" value={bundle.galleryItems.length} helper="private visual archive" tone="blue" />
                    <MetricCard label="Interior" value={interiorCount} helper="inside the property" tone="neutral" />
                    <MetricCard label="Exterior" value={exteriorCount} helper="building and surroundings" tone="neutral" />
                    <MetricCard label="Areas covered" value={roomCount} helper="rooms or named locations" tone="gold" />
                </div>

                {showUploader ? (
                    <div className="mt-3 rounded-[16px] border border-[#2f80ed]/[0.18] bg-[linear-gradient(145deg,rgba(47,128,237,0.06),rgba(255,255,255,0.42))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                            <SelectField label="Type" value={uploadDraft.gallery_type} onChange={(value) => setUploadDraft((current) => ({ ...current, gallery_type: value }))} options={[{ value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" }]} />
                            <TextField label="Room / area" value={uploadDraft.room_area} onChange={(value) => setUploadDraft((current) => ({ ...current, room_area: value }))} placeholder="Living room, facade..." />
                            <DateField label="Photo date" value={uploadDraft.photo_date} onChange={(value) => setUploadDraft((current) => ({ ...current, photo_date: value }))} />
                            <TextField label="Caption" value={uploadDraft.caption} onChange={(value) => setUploadDraft((current) => ({ ...current, caption: value }))} placeholder="Optional shared caption" />
                        </div>

                        <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            onDragOver={(event) => { event.preventDefault(); setDropActive(true); }}
                            onDragLeave={() => setDropActive(false)}
                            onDrop={(event) => { event.preventDefault(); setDropActive(false); addUploadFiles(Array.from(event.dataTransfer.files ?? [])); }}
                            className={["mt-3 flex w-full flex-col items-center justify-center rounded-[14px] border border-dashed px-4 py-5 text-center transition duration-200", dropActive ? "border-[#2f80ed]/[0.48] bg-[#2f80ed]/[0.11] shadow-[0_12px_30px_rgba(47,128,237,0.10)]" : "border-[#aebfd1] bg-white/[0.46] hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.30] hover:bg-white/[0.68]"].join(" ")}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/[0.80] bg-white/[0.72] text-[#607993] shadow-[0_8px_20px_rgba(41,73,112,0.08)]"><IconUpload /></span>
                            <span className="mt-2 text-[10.5px] font-semibold text-[#0b1623]">Drop images here or click to browse</span>
                            <span className="mt-0.5 text-[9px] text-[#7a90a8]">JPEG, PNG, WebP or AVIF · maximum 25 MB per file</span>
                        </button>
                        <input ref={galleryInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { addUploadFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />

                        {uploadFiles.length > 0 ? (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-white/[0.76] bg-white/[0.54] px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10.5px] font-semibold text-[#0b1623]">{uploadFiles.length} photo{uploadFiles.length === 1 ? "" : "s"} ready</div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {uploadFiles.slice(0, 5).map((file) => <span key={`${file.name}-${file.lastModified}`} className="max-w-[190px] truncate rounded-full border border-[#ccd9e8] bg-white/[0.68] px-2 py-0.5 text-[8.5px] text-[#607993]">{file.name}</span>)}
                                        {uploadFiles.length > 5 ? <span className="rounded-full border border-[#ccd9e8] bg-white/[0.68] px-2 py-0.5 text-[8.5px] text-[#607993]">+{uploadFiles.length - 5} more</span> : null}
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button type="button" disabled={saving} onClick={() => setUploadFiles([])} className={BUTTON_NEUTRAL}>Clear</button>
                                    <button type="button" disabled={saving} onClick={() => void uploadPhotos()} className={BUTTON_BLUE}>{saving ? "Uploading..." : "Upload photos"}</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/[0.74] bg-white/[0.46] p-2.5">
                    <div className="inline-flex rounded-[11px] border border-[#ccd9e8] bg-white/[0.54] p-1">
                        {(["all", "interior", "exterior"] as const).map((value) => (
                            <button key={value} type="button" onClick={() => setFilter(value)} className={["rounded-[8px] px-3 py-1.5 text-[9.5px] font-semibold capitalize transition", filter === value ? "bg-[#2f80ed]/[0.12] text-[#1560bc] shadow-[0_4px_12px_rgba(47,128,237,0.08)]" : "text-[#7a90a8] hover:bg-white/[0.72] hover:text-[#0b1623]"].join(" ")}>{value}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-[9.5px] text-[#7a90a8]"><span className="hidden sm:inline">Drag thumbnails to reorder.</span><span className="font-semibold">{filteredItems.length} shown</span></div>
                </div>

                <div className="mt-3">
                    {bundle.galleryItems.length === 0 ? (
                        <EmptyState icon={<IconImage />} title="No gallery photos yet" text="Add a small set of clear interior and exterior images. The first uploaded image becomes the cover automatically." action={<button type="button" onClick={() => setShowUploader(true)} className={BUTTON_BLUE}><IconPlus /> Add first photos</button>} />
                    ) : filteredItems.length === 0 ? (
                        <EmptyState icon={<IconImage />} title={`No ${filter} photos`} text="Switch the filter or upload photos for this category." action={<button type="button" onClick={() => setFilter("all")} className={BUTTON_NEUTRAL}>Show all photos</button>} />
                    ) : (
                        <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(154px, 1fr))" }}
                        >
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(event) => { setDraggedId(item.id); event.dataTransfer.effectAllowed = "move"; }}
                                    onDragEnd={() => setDraggedId(null)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => { event.preventDefault(); if (draggedId) void reorderGallery(draggedId, item.id); }}
                                    className="group relative overflow-hidden rounded-[15px] border border-white/[0.78] bg-white/[0.56] text-left transition duration-200 hover:-translate-y-1 hover:scale-[1.008] hover:border-[#2f80ed]/[0.25] hover:bg-white/[0.82] hover:shadow-[0_18px_40px_rgba(41,73,112,0.13)]"
                                    style={{ height: 132 }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => selectGalleryItem(item)}
                                        className="block h-full w-full overflow-hidden text-left"
                                        aria-label={`Open ${item.file_name}`}
                                    >
                                        <div className="relative h-full w-full overflow-hidden bg-[#eef3f8]">
                                            {signedUrls[item.storage_path] ? (
                                                <img
                                                    src={signedUrls[item.storage_path]}
                                                    alt={item.caption || item.room_area || "Property photo"}
                                                    className="block transition duration-300 group-hover:scale-[1.045]"
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-[#91a4b8]"><IconImage /></div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#06101d]/[0.58] via-transparent to-[#06101d]/[0.10] opacity-75 transition group-hover:opacity-90" />
                                            <div className="absolute left-2 top-2 flex gap-1">
                                                <span className="rounded-full border border-white/[0.64] bg-[#07111f]/[0.56] px-2 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">{item.gallery_type}</span>
                                                {item.is_cover ? <span className="rounded-full border border-[#e2c76c]/[0.72] bg-[#7d6620]/[0.72] px-2 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">Cover</span> : null}
                                            </div>
                                            <span className="absolute right-2 top-2 flex h-7 w-7 cursor-grab items-center justify-center rounded-full border border-white/[0.50] bg-[#07111f]/[0.42] text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100"><IconGrip /></span>
                                            <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-6 text-white">
                                                <div className="truncate text-[10.5px] font-semibold">{item.room_area || "Unspecified area"}</div>
                                                <div className="mt-0.5 truncate text-[8.5px] text-white/[0.74]">{item.caption || formatDate(item.photo_date)}</div>
                                            </div>
                                        </div>
                                    </button>
                                    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={(event) => { event.stopPropagation(); selectGalleryItem(item); setDetailsOpen(true); }}
                                            className="pointer-events-auto rounded-full border border-white/[0.54] bg-[#07111f]/[0.62] px-2 py-1 text-[8px] font-semibold text-white backdrop-blur-md transition hover:bg-[#07111f]/[0.82]"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => { event.stopPropagation(); removeGalleryItem(item); }}
                                            className="pointer-events-auto rounded-full border border-white/[0.54] bg-[#8f2626]/[0.66] px-2 py-1 text-[8px] font-semibold text-white backdrop-blur-md transition hover:bg-[#8f2626]/[0.88]"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </WorkspaceShell>

            {selectedItem && viewerItems.length > 0 ? (
                <MediaViewer
                    items={viewerItems}
                    activeId={selectedItem.id}
                    onActiveChange={changeViewerSelection}
                    onClose={closeViewer}
                    detailsOpen={detailsOpen}
                    detailsPanel={detailsPanel}
                    topActions={
                        <>
                            {signedUrls[selectedItem.storage_path] ? (
                                <a
                                    href={signedUrls[selectedItem.storage_path]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hidden rounded-full border border-white/[0.18] bg-white/[0.08] px-3 py-2 text-[9.5px] font-semibold text-white transition hover:bg-white/[0.16] sm:inline-flex"
                                >
                                    Open original
                                </a>
                            ) : null}
                            {!selectedItem.is_cover ? (
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void makeCover(selectedItem)}
                                    className="hidden rounded-full border border-[#e2c76c]/[0.34] bg-[#7d6620]/[0.20] px-3 py-2 text-[9.5px] font-semibold text-white transition hover:bg-[#7d6620]/[0.34] sm:inline-flex"
                                >
                                    Set cover
                                </button>
                            ) : null}
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => removeGalleryItem(selectedItem)}
                                className="hidden rounded-full border border-[#d96969]/[0.34] bg-[#9d2f2f]/[0.20] px-3 py-2 text-[9.5px] font-semibold text-white transition hover:bg-[#9d2f2f]/[0.36] sm:inline-flex"
                            >
                                Delete
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailsOpen((value) => !value)}
                                className={["rounded-full border px-3 py-2 text-[9.5px] font-semibold transition", detailsOpen ? "border-[#6ea8ff]/[0.52] bg-[#2f80ed]/[0.24] text-white" : "border-white/[0.18] bg-white/[0.08] text-white hover:bg-white/[0.16]"].join(" ")}
                            >
                                {detailsOpen ? "Hide details" : "Edit details"}
                            </button>
                        </>
                    }
                    badges={
                        <>
                            <span className="rounded-full border border-white/[0.18] bg-white/[0.08] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white">{selectedItem.gallery_type}</span>
                            {selectedItem.is_cover ? <span className="rounded-full border border-[#e2c76c]/[0.52] bg-[#7d6620]/[0.44] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white">Cover</span> : null}
                        </>
                    }
                />
            ) : null}
        </>
    );
}
