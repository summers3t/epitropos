"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
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

type SharedSectionProps = {
    managedPropertyId: string;
    bundle: ManagedPropertyAssetsBundle;
    signedUrls: Record<string, string>;
    saving: boolean;
    setSaving: (value: boolean) => void;
    setError: (value: string | null) => void;
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

    async function loadAssets(preferredInventoryId?: string | null, preferredGalleryId?: string | null) {
        setLoading(true);
        setError(null);
        try {
            const next = await getManagedPropertyAssets(managedPropertyId);
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
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managedPropertyId]);

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
                    reload={loadAssets}
                />
            )}
        </div>
    );
}

function InventorySection({
    managedPropertyId,
    bundle,
    signedUrls,
    saving,
    setSaving,
    setError,
    reload,
}: SharedSectionProps) {
    const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
    const [draft, setDraft] = useState<InventoryDraft>(newInventoryDraft);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
    const [search, setSearch] = useState("");
    const [extraAttachmentType, setExtraAttachmentType] = useState<ManagedPropertyInventoryAttachmentType>("invoice");
    const primaryPhotoInputRef = useRef<HTMLInputElement | null>(null);
    const warrantyInputRef = useRef<HTMLInputElement | null>(null);
    const extraAttachmentInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!selectedId || selectedId === "new") return;
        const selected = bundle.inventoryItems.find((item) => item.id === selectedId);
        if (!selected) {
            setSelectedId(null);
            setDraft(newInventoryDraft());
            return;
        }
        setDraft(inventoryToDraft(selected));
    }, [bundle.inventoryItems, selectedId]);

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
    const primaryPhoto = photos.find((attachment) => attachment.is_primary) ?? photos[0] ?? null;
    const warranty = getWarrantyState(draft.warranty_until);

    const activeItems = bundle.inventoryItems.filter((item) => item.status === "active").length;
    const rooms = new Set(bundle.inventoryItems.map((item) => item.room?.trim()).filter(Boolean)).size;
    const warrantyAttention = bundle.inventoryItems.filter((item) => {
        const tone = getWarrantyState(item.warranty_until).tone;
        return tone === "soon" || tone === "expired";
    }).length;
    const documentCount = bundle.inventoryAttachments.filter((attachment) => attachment.attachment_type !== "photo").length;

    function selectItem(item: ManagedPropertyInventoryItem) {
        if (selectedId === item.id) {
            setSelectedId(null);
            setShowAdvanced(false);
            return;
        }
        setSelectedId(item.id);
        setDraft(inventoryToDraft(item));
        setShowAdvanced(false);
        setError(null);
    }

    function startNewItem() {
        setSelectedId("new");
        setDraft(newInventoryDraft());
        setShowAdvanced(false);
        setError(null);
    }

    function cancelEditor() {
        setSelectedId(null);
        setDraft(newInventoryDraft());
        setShowAdvanced(false);
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

        setSaving(true);
        setError(null);
        try {
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

            let saved: ManagedPropertyInventoryItem;
            if (selectedId === "new" || !selectedItem) {
                const nextSortOrder = Math.max(0, ...bundle.inventoryItems.map((item) => item.sort_order)) + 10;
                saved = await createManagedPropertyInventoryItem({
                    managed_property_id: managedPropertyId,
                    ...payload,
                    sort_order: nextSortOrder,
                });
            } else {
                saved = await updateManagedPropertyInventoryItem(selectedItem.id, payload);
            }

            const loaded = await reload(saved.id, null);
            const reloadedItem = loaded?.next.inventoryItems.find((item) => item.id === saved.id) ?? saved;
            setSelectedId(reloadedItem.id);
            setDraft(inventoryToDraft(reloadedItem));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save item");
        } finally {
            setSaving(false);
        }
    }

    async function removeItem() {
        if (!selectedItem) return;
        if (!window.confirm(`Delete “${selectedItem.name}” and all attached files?`)) return;

        setSaving(true);
        setError(null);
        try {
            await deleteManagedPropertyInventoryItem(selectedItem.id);
            setSelectedId(null);
            setDraft(newInventoryDraft());
            await reload();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete item");
        } finally {
            setSaving(false);
        }
    }

    async function uploadAttachment(file: File | null, attachmentType: ManagedPropertyInventoryAttachmentType, makePrimary = false) {
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
        setSaving(true);
        setError(null);
        try {
            await setManagedPropertyInventoryPrimaryPhoto(attachment.inventory_item_id, attachment.id);
            await reload(attachment.inventory_item_id, null);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to set primary photo");
        } finally {
            setSaving(false);
        }
    }

    async function removeAttachment(attachment: ManagedPropertyInventoryAttachment) {
        if (!window.confirm(`Delete ${attachment.file_name}?`)) return;

        setSaving(true);
        setError(null);
        try {
            await deleteManagedPropertyInventoryAttachment(attachment);
            await reload(attachment.inventory_item_id, null);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete file");
        } finally {
            setSaving(false);
        }
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
                        {!isNew ? <button type="button" disabled={saving} onClick={() => void removeItem()} className={BUTTON_RED}>Delete</button> : null}
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

                <div className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-[14px] border border-[#d8e8f6]/80 bg-white/[0.54] p-3 transition duration-200 hover:border-[#2f80ed]/[0.17] hover:bg-white/[0.68]">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-[10.5px] font-semibold text-[#0b1623]">Primary photo</div>
                                <div className="mt-0.5 text-[9px] text-[#7a90a8]">Used in the inventory summary.</div>
                            </div>
                            <button type="button" disabled={!selectedItem || saving} onClick={() => primaryPhotoInputRef.current?.click()} className={BUTTON_BLUE}><IconUpload /> Upload</button>
                        </div>
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                            <div className="h-24 overflow-hidden rounded-[12px] border border-[#d4dfeb] bg-[#eef3f8]">
                                {primaryPhoto && signedUrls[primaryPhoto.storage_path] ? (
                                    <img src={signedUrls[primaryPhoto.storage_path]} alt={draft.name || "Inventory item"} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-[#7a90a8]"><IconImage /><span className="text-[9.5px]">{selectedItem ? "No photo yet" : "Save item first"}</span></div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Photo library</div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {photos.length === 0 ? <span className="text-[9.5px] text-[#7a90a8]">Additional photos will appear here.</span> : photos.map((attachment) => (
                                        <div key={attachment.id} className="group relative h-14 w-16 overflow-hidden rounded-[9px] border border-white/[0.82] bg-[#eef3f8] shadow-[0_7px_18px_rgba(41,73,112,0.08)]">
                                            {signedUrls[attachment.storage_path] ? <img src={signedUrls[attachment.storage_path]} alt="" className="h-full w-full object-cover" /> : null}
                                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#06101d]/[0.64] px-1 py-0.5 text-[7px] text-white opacity-0 transition group-hover:opacity-100">
                                                {!attachment.is_primary ? <button type="button" onClick={() => void makePrimary(attachment)}>Primary</button> : <span>Primary</span>}
                                                <button type="button" onClick={() => void removeAttachment(attachment)}>×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <input ref={primaryPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, "photo", true); event.currentTarget.value = ""; }} />
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
                                <div className="sm:col-span-2 flex h-24 items-center justify-center rounded-[12px] border border-dashed border-[#c4d1df] bg-white/[0.34] px-4 text-center text-[9.5px] text-[#7a90a8]">{selectedItem ? "No warranty document uploaded" : "Save item first, then attach documents"}</div>
                            ) : warrantyDocuments.map((attachment) => (
                                <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => void removeAttachment(attachment)} />
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
                                {extraDocuments.length === 0 ? <div className="sm:col-span-2 xl:col-span-3 rounded-[11px] border border-dashed border-[#c4d1df] bg-white/[0.30] px-3 py-3 text-center text-[9.5px] text-[#7a90a8]">No additional files.</div> : extraDocuments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => void removeAttachment(attachment)} />)}
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

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[14px] border border-white/[0.74] bg-white/[0.46] p-2.5">
                <label className="relative min-w-[220px] flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a90a8]"><IconSearch /></span>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, room, brand or model" className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] pl-9 pr-3 text-[11.5px] text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]" />
                </label>
                <div className="inline-flex rounded-[11px] border border-[#ccd9e8] bg-white/[0.54] p-1">
                    {(["active", "all"] as const).map((value) => (
                        <button key={value} type="button" onClick={() => setStatusFilter(value)} className={["rounded-[8px] px-3 py-1.5 text-[9.5px] font-semibold capitalize transition", statusFilter === value ? "bg-[#2f80ed]/[0.12] text-[#1560bc] shadow-[0_4px_12px_rgba(47,128,237,0.08)]" : "text-[#7a90a8] hover:bg-white/[0.72] hover:text-[#0b1623]"].join(" ")}>{value}</button>
                    ))}
                </div>
                <div className="text-[9.5px] font-semibold text-[#7a90a8]">{filteredItems.length} shown</div>
            </div>

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
                    <EmptyState icon={<IconSearch />} title="No matching items" text="Change the search phrase or show all lifecycle states." action={<div className="flex gap-2"><button type="button" onClick={() => setSearch("")} className={BUTTON_NEUTRAL}>Clear search</button><button type="button" onClick={() => setStatusFilter("all")} className={BUTTON_BLUE}>Show all</button></div>} />
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
                                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-[12px] border border-white/[0.84] bg-[#eef3f8] shadow-[0_8px_20px_rgba(41,73,112,0.08)]">
                                    {itemPhoto && signedUrls[itemPhoto.storage_path] ? <img src={signedUrls[itemPhoto.storage_path]} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-[#91a4b8]"><IconBox /></div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-[12px] font-semibold text-[#0b1623]">{item.name}</div>
                                        <CompactBadge tone={item.status === "active" ? "green" : "neutral"}>{item.status}</CompactBadge>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <CompactBadge tone="blue">{categoryLabel(item.category)}</CompactBadge>
                                        {item.room ? <CompactBadge>{item.room}</CompactBadge> : null}
                                        <CompactBadge>{conditionLabel(item.condition)}</CompactBadge>
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
    );
}

function GallerySection({
    managedPropertyId,
    bundle,
    signedUrls,
    saving,
    setSaving,
    setError,
    reload,
}: SharedSectionProps) {
    const [filter, setFilter] = useState<"all" | ManagedPropertyGalleryType>("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<GalleryDraft>(newGalleryDraft);
    const [showUploader, setShowUploader] = useState(false);
    const [uploadDraft, setUploadDraft] = useState<GalleryDraft>(newGalleryDraft);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropActive, setDropActive] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    const filteredItems = useMemo(() => filter === "all" ? bundle.galleryItems : bundle.galleryItems.filter((item) => item.gallery_type === filter), [bundle.galleryItems, filter]);
    const selectedItem = bundle.galleryItems.find((item) => item.id === selectedId) ?? null;
    const selectedFilteredIndex = selectedItem ? filteredItems.findIndex((item) => item.id === selectedItem.id) : -1;

    useEffect(() => {
        if (!selectedId) return;
        const selected = bundle.galleryItems.find((item) => item.id === selectedId);
        if (!selected) {
            setSelectedId(null);
            setDraft(newGalleryDraft());
            return;
        }
        setDraft(galleryToDraft(selected));
    }, [bundle.galleryItems, selectedId]);

    useEffect(() => {
        if (!selectedItem) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setSelectedId(null);
                return;
            }

            if (filteredItems.length < 2) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                const direction = event.key === "ArrowLeft" ? -1 : 1;
                const nextIndex = (selectedFilteredIndex + direction + filteredItems.length) % filteredItems.length;
                const next = filteredItems[nextIndex];
                setSelectedId(next.id);
                setDraft(galleryToDraft(next));
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [filteredItems, selectedFilteredIndex, selectedItem]);

    const interiorCount = bundle.galleryItems.filter((item) => item.gallery_type === "interior").length;
    const exteriorCount = bundle.galleryItems.filter((item) => item.gallery_type === "exterior").length;
    const roomCount = new Set(bundle.galleryItems.map((item) => item.room_area?.trim()).filter(Boolean)).size;

    function selectGalleryItem(item: ManagedPropertyGalleryItem) {
        setSelectedId(item.id);
        setDraft(galleryToDraft(item));
        setError(null);
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
            const loaded = await reload(null, firstCreatedId);
            const reloadedItem = firstCreatedId ? loaded?.next.galleryItems.find((item) => item.id === firstCreatedId) ?? null : null;
            setSelectedId(reloadedItem?.id ?? firstCreatedId);
            if (reloadedItem) setDraft(galleryToDraft(reloadedItem));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to upload gallery photos");
        } finally {
            setSaving(false);
        }
    }

    async function saveGalleryItem() {
        if (!selectedItem) return;
        setSaving(true);
        setError(null);
        try {
            await updateManagedPropertyGalleryItem(selectedItem.id, {
                gallery_type: draft.gallery_type,
                room_area: blankToNull(draft.room_area),
                caption: blankToNull(draft.caption),
                photo_date: draft.photo_date || null,
            });
            await reload(null, selectedItem.id);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save gallery photo");
        } finally {
            setSaving(false);
        }
    }

    async function makeCover(item: ManagedPropertyGalleryItem) {
        setSaving(true);
        setError(null);
        try {
            await setManagedPropertyGalleryCover(managedPropertyId, item.id);
            await reload(null, item.id);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to set cover photo");
        } finally {
            setSaving(false);
        }
    }

    async function removeGalleryItem(item: ManagedPropertyGalleryItem) {
        if (!window.confirm(`Delete ${item.file_name}?`)) return;
        setSaving(true);
        setError(null);
        try {
            await deleteManagedPropertyGalleryItem(item);
            setSelectedId(null);
            await reload();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete gallery photo");
        } finally {
            setSaving(false);
        }
    }

    async function reorderGallery(draggedItemId: string, targetItemId: string) {
        if (draggedItemId === targetItemId) return;
        const ordered = [...bundle.galleryItems].sort((left, right) => left.sort_order - right.sort_order);
        const from = ordered.findIndex((item) => item.id === draggedItemId);
        const to = ordered.findIndex((item) => item.id === targetItemId);
        if (from < 0 || to < 0) return;

        const next = [...ordered];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);

        setSaving(true);
        setError(null);
        try {
            await Promise.all(next.map((item, index) => updateManagedPropertyGalleryItem(item.id, { sort_order: (index + 1) * 10 })));
            await reload(null, selectedId);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to reorder gallery");
        } finally {
            setSaving(false);
            setDraggedId(null);
        }
    }

    function moveSelection(direction: -1 | 1) {
        if (selectedFilteredIndex < 0 || filteredItems.length < 2) return;
        const nextIndex = (selectedFilteredIndex + direction + filteredItems.length) % filteredItems.length;
        const next = filteredItems[nextIndex];
        setSelectedId(next.id);
        setDraft(galleryToDraft(next));
    }

    return (
        <WorkspaceShell
            title="Gallery"
            subtitle="A clean interior and exterior archive. Browse from the grid, open a focused inspector only when needed, and drag thumbnails to refine the visual order."
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
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {filteredItems.map((item) => {
                            const active = item.id === selectedId;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    draggable
                                    onDragStart={(event) => { setDraggedId(item.id); event.dataTransfer.effectAllowed = "move"; }}
                                    onDragEnd={() => setDraggedId(null)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => { event.preventDefault(); if (draggedId) void reorderGallery(draggedId, item.id); }}
                                    onClick={() => selectGalleryItem(item)}
                                    className={["group relative overflow-hidden rounded-[15px] border text-left transition duration-200", active ? "border-[#2f80ed]/[0.42] bg-[#2f80ed]/[0.08] shadow-[0_14px_34px_rgba(47,128,237,0.13)]" : "border-white/[0.78] bg-white/[0.56] hover:-translate-y-1 hover:scale-[1.008] hover:border-[#2f80ed]/[0.25] hover:bg-white/[0.82] hover:shadow-[0_18px_40px_rgba(41,73,112,0.13)]"].join(" ")}
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[#eef3f8]">
                                        {signedUrls[item.storage_path] ? <img src={signedUrls[item.storage_path]} alt={item.caption || item.room_area || "Property photo"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.045]" /> : <div className="flex h-full items-center justify-center text-[#91a4b8]"><IconImage /></div>}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#06101d]/[0.52] via-transparent to-[#06101d]/[0.10] opacity-75 transition group-hover:opacity-90" />
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
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedItem ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
                    <button type="button" aria-label="Close gallery inspector" onClick={() => setSelectedId(null)} className="fixed inset-0 bg-[#06101d]/[0.58] backdrop-blur-[12px]" />
                    <div className="relative grid max-h-[90dvh] w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-white/[0.72] bg-white/[0.86] shadow-[0_34px_120px_rgba(6,16,29,0.46),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden bg-[#07111f] lg:min-h-[650px]">
                            {signedUrls[selectedItem.storage_path] ? <img src={signedUrls[selectedItem.storage_path]} alt={selectedItem.caption || "Property photo"} className="max-h-[68dvh] w-full object-contain lg:max-h-[82dvh]" /> : <div className="text-[11px] text-white/[0.62]">Preview unavailable</div>}
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_42%)]" />
                            {filteredItems.length > 1 ? (
                                <>
                                    <button type="button" onClick={() => moveSelection(-1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.30] bg-[#07111f]/[0.46] text-white backdrop-blur-md transition hover:scale-[1.05] hover:bg-[#07111f]/[0.68]"><IconArrow direction="left" /></button>
                                    <button type="button" onClick={() => moveSelection(1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.30] bg-[#07111f]/[0.46] text-white backdrop-blur-md transition hover:scale-[1.05] hover:bg-[#07111f]/[0.68]"><IconArrow direction="right" /></button>
                                </>
                            ) : null}
                            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-white/[0.30] bg-[#07111f]/[0.50] px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">{selectedItem.gallery_type}</span>
                                {selectedItem.is_cover ? <span className="rounded-full border border-[#e2c76c]/[0.62] bg-[#7d6620]/[0.66] px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">Current cover</span> : null}
                            </div>
                        </div>

                        <div className="flex min-h-0 flex-col bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(242,246,250,0.82))]">
                            <div className="flex items-start justify-between gap-3 border-b border-white/[0.78] px-4 py-3.5">
                                <div className="min-w-0">
                                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#2f80ed]">Photo details</div>
                                    <div className="mt-1 truncate text-[12px] font-semibold text-[#0b1623]">{selectedItem.file_name}</div>
                                    <div className="mt-0.5 text-[8.5px] text-[#7a90a8]">{formatFileSize(selectedItem.file_size_bytes)} · {selectedFilteredIndex + 1} of {filteredItems.length}</div>
                                </div>
                                <button type="button" onClick={() => setSelectedId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] transition hover:bg-white hover:text-[#0b1623] active:scale-[0.96]" aria-label="Close"><IconClose /></button>
                            </div>

                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
                                <SelectField label="Type" value={draft.gallery_type} onChange={(value) => setDraft((current) => ({ ...current, gallery_type: value }))} options={[{ value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" }]} />
                                <TextField label="Room / area" value={draft.room_area} onChange={(value) => setDraft((current) => ({ ...current, room_area: value }))} placeholder="Living room, facade..." />
                                <DateField label="Photo date" value={draft.photo_date} onChange={(value) => setDraft((current) => ({ ...current, photo_date: value }))} />
                                <label className="block"><FieldLabel>Caption</FieldLabel><textarea value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} rows={4} className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] leading-relaxed text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(47,128,237,0.08)]" /></label>
                                <div className="rounded-[13px] border border-white/[0.78] bg-white/[0.56] p-3">
                                    <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">File metadata</div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px]">
                                        <div><div className="text-[#7a90a8]">Uploaded</div><div className="mt-0.5 font-semibold text-[#0b1623]">{formatDate(selectedItem.created_at?.slice(0, 10))}</div></div>
                                        <div><div className="text-[#7a90a8]">Photo date</div><div className="mt-0.5 font-semibold text-[#0b1623]">{formatDate(selectedItem.photo_date)}</div></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.78] bg-white/[0.50] px-4 py-3">
                                <div className="flex gap-1.5">
                                    <button type="button" disabled={saving} onClick={() => void removeGalleryItem(selectedItem)} className={BUTTON_RED}>Delete</button>
                                    {signedUrls[selectedItem.storage_path] ? <a href={signedUrls[selectedItem.storage_path]} target="_blank" rel="noreferrer" className={BUTTON_NEUTRAL}>Open original</a> : null}
                                </div>
                                <div className="flex gap-1.5">
                                    {!selectedItem.is_cover ? <button type="button" disabled={saving} onClick={() => void makeCover(selectedItem)} className={BUTTON_GOLD}>Set cover</button> : null}
                                    <button type="button" disabled={saving} onClick={() => void saveGalleryItem()} className={BUTTON_BLUE}>{saving ? "Saving..." : "Save"}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </WorkspaceShell>
    );
}
