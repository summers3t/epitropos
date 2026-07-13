"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
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

type Props = {
    managedPropertyId: string;
    section: "inventory" | "gallery";
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

function getWarrantyState(value: string | null | undefined): {
    tone: WarrantyTone;
    label: string;
} {
    if (!value) return { tone: "none", label: "No warranty date" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(`${value}T00:00:00`);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);

    if (days < 0) return { tone: "expired", label: `Expired ${formatDate(value)}` };
    if (days <= 30) return { tone: "soon", label: `Expires in ${days} day${days === 1 ? "" : "s"}` };
    return { tone: "active", label: `In warranty until ${formatDate(value)}` };
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

function warrantyClasses(tone: WarrantyTone) {
    if (tone === "active") return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.10] text-[#0f7448]";
    if (tone === "soon") return "border-[#d6a92d]/[0.28] bg-[#d6a92d]/[0.12] text-[#8a6511]";
    if (tone === "expired") return "border-[#d96969]/[0.28] bg-[#d96969]/[0.11] text-[#9d2f2f]";
    return "border-[#a9b8c8]/[0.26] bg-[#a9b8c8]/[0.10] text-[#607993]";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
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
                className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition focus:border-[#2f80ed]/50 focus:bg-white"
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
                className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition focus:border-[#2f80ed]/50 focus:bg-white"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
                {value ? (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="h-9 rounded-[11px] border border-[#ccd9e8] bg-white/[0.64] px-2.5 text-[11px] font-semibold text-[#607993] transition hover:bg-white"
                    >
                        Clear
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function SectionShell({
    eyebrow,
    title,
    subtitle,
    action,
    children,
}: {
    eyebrow: string;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[20px] border border-white/[0.80] bg-white/[0.58] p-4 shadow-[0_16px_46px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.17em] text-[#2f80ed]">{eyebrow}</div>
                    <h3 className="mt-1 font-display text-[24px] font-normal tracking-[-0.025em] text-[#0b1623]">{title}</h3>
                    <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-[#7a90a8]">{subtitle}</p>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function ManagedPropertyAssetsPanel({ managedPropertyId, section }: Props) {
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
            <div className="rounded-[20px] border border-white/[0.80] bg-white/[0.58] p-6 text-[12px] font-semibold text-[#607993] shadow-[0_16px_46px_rgba(41,73,112,0.08)]">
                Loading property assets...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error ? (
                <div className="rounded-[14px] border border-[#d96969]/[0.24] bg-[#d96969]/[0.08] px-3 py-2.5 text-[11.5px] font-semibold text-[#9d2f2f]">
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

function InventorySection({
    managedPropertyId,
    bundle,
    signedUrls,
    saving,
    setSaving,
    setError,
    reload,
}: SharedSectionProps) {
    const [selectedId, setSelectedId] = useState<string | "new" | null>(bundle.inventoryItems[0]?.id ?? null);
    const [draft, setDraft] = useState<InventoryDraft>(() => {
        const first = bundle.inventoryItems[0];
        return first ? inventoryToDraft(first) : newInventoryDraft();
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
    const [search, setSearch] = useState("");
    const [extraAttachmentType, setExtraAttachmentType] = useState<ManagedPropertyInventoryAttachmentType>("invoice");
    const primaryPhotoInputRef = useRef<HTMLInputElement | null>(null);
    const warrantyInputRef = useRef<HTMLInputElement | null>(null);
    const extraAttachmentInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (selectedId === "new") return;
        const selected = bundle.inventoryItems.find((item) => item.id === selectedId);
        if (selected) {
            setDraft(inventoryToDraft(selected));
            return;
        }

        const fallback = bundle.inventoryItems[0];
        setSelectedId(fallback?.id ?? null);
        setDraft(fallback ? inventoryToDraft(fallback) : newInventoryDraft());
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

    function selectItem(item: ManagedPropertyInventoryItem) {
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
            await reload();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete item");
        } finally {
            setSaving(false);
        }
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

    return (
        <SectionShell
            eyebrow="Property inventory"
            title="Furniture & Appliances"
            subtitle="A practical inventory of furniture, appliances and equipment. Essential fields stay visible; serials, purchase details and lifecycle data remain under Advanced details."
            action={(
                <button
                    type="button"
                    onClick={startNewItem}
                    disabled={saving}
                    className="rounded-[11px] border border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.10] px-3.5 py-2 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.16] disabled:opacity-50"
                >
                    + Add item
                </button>
            )}
        >
            <div className="grid min-h-[520px] gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-[17px] border border-white/[0.76] bg-white/[0.48] p-3">
                    <div className="flex gap-1.5">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search inventory"
                            className="h-9 min-w-0 flex-1 rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[11.5px] text-[#0b1623] outline-none focus:border-[#2f80ed]/50"
                        />
                        <button
                            type="button"
                            onClick={() => setStatusFilter((value) => value === "active" ? "all" : "active")}
                            className="h-9 rounded-[11px] border border-[#ccd9e8] bg-white/[0.70] px-2.5 text-[10px] font-semibold text-[#607993] transition hover:bg-white"
                        >
                            {statusFilter === "active" ? "Active" : "All"}
                        </button>
                    </div>

                    <div className="mt-3 space-y-2">
                        {filteredItems.length === 0 ? (
                            <div className="rounded-[14px] border border-dashed border-[#b8c8da] bg-white/[0.38] px-3 py-7 text-center text-[11px] text-[#7a90a8]">
                                No inventory items in this view.
                            </div>
                        ) : filteredItems.map((item) => {
                            const active = item.id === selectedId;
                            const itemAttachments = bundle.inventoryAttachments.filter((attachment) => attachment.inventory_item_id === item.id);
                            const itemPhoto = itemAttachments.find((attachment) => attachment.attachment_type === "photo" && attachment.is_primary)
                                ?? itemAttachments.find((attachment) => attachment.attachment_type === "photo")
                                ?? null;
                            const itemWarranty = getWarrantyState(item.warranty_until);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectItem(item)}
                                    className={[
                                        "flex w-full gap-2.5 rounded-[14px] border p-2.5 text-left transition",
                                        active
                                            ? "border-[#2f80ed]/[0.34] bg-[#2f80ed]/[0.10] shadow-[0_10px_26px_rgba(47,128,237,0.09)]"
                                            : "border-white/[0.70] bg-white/[0.52] hover:border-[#2f80ed]/[0.22] hover:bg-white/[0.78]",
                                    ].join(" ")}
                                >
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] border border-white/[0.80] bg-[#eef3f8]">
                                        {itemPhoto && signedUrls[itemPhoto.storage_path] ? (
                                            <img src={signedUrls[itemPhoto.storage_path]} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[18px] text-[#91a4b8]">□</div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[12px] font-semibold text-[#0b1623]">{item.name}</div>
                                        <div className="mt-0.5 truncate text-[10px] text-[#7a90a8]">
                                            {CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label ?? item.category}
                                            {item.room ? ` · ${item.room}` : ""}
                                        </div>
                                        <div className={["mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[8.5px] font-semibold", warrantyClasses(itemWarranty.tone)].join(" ")}>{itemWarranty.label}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[17px] border border-white/[0.76] bg-white/[0.48] p-3.5">
                    {selectedId === null ? (
                        <div className="flex min-h-[480px] items-center justify-center rounded-[15px] border border-dashed border-[#b8c8da] bg-white/[0.32] px-6 text-center text-[12px] text-[#7a90a8]">
                            Select an item or add a new one.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7a90a8]">{selectedId === "new" ? "New inventory item" : "Item details"}</div>
                                    <div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{draft.name || "Untitled item"}</div>
                                </div>
                                <div className={["rounded-full border px-2.5 py-1 text-[9.5px] font-semibold", warrantyClasses(warranty.tone)].join(" ")}>{warranty.label}</div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <TextField label="Name *" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="e.g. Washing machine" />
                                </div>
                                <SelectField label="Category" value={draft.category} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} options={CATEGORY_OPTIONS} />
                                <TextField label="Room" value={draft.room} onChange={(value) => setDraft((current) => ({ ...current, room: value }))} placeholder="Kitchen, bedroom..." />
                                <SelectField label="Condition" value={draft.condition} onChange={(value) => setDraft((current) => ({ ...current, condition: value }))} options={CONDITION_OPTIONS} />
                                <DateField label="Warranty until" value={draft.warranty_until} onChange={(value) => setDraft((current) => ({ ...current, warranty_until: value }))} />
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                                <div className="rounded-[15px] border border-white/[0.78] bg-white/[0.54] p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-[10px] font-semibold text-[#0b1623]">Primary photo</div>
                                            <div className="mt-0.5 text-[9.5px] text-[#7a90a8]">Visual reference for the inventory card.</div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!selectedItem || saving}
                                            onClick={() => primaryPhotoInputRef.current?.click()}
                                            className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-[#1560bc] disabled:opacity-40"
                                        >
                                            Upload
                                        </button>
                                    </div>
                                    <div className="mt-2.5 h-32 overflow-hidden rounded-[12px] border border-[#d4dfeb] bg-[#eef3f8]">
                                        {primaryPhoto && signedUrls[primaryPhoto.storage_path] ? (
                                            <img src={signedUrls[primaryPhoto.storage_path]} alt={draft.name || "Inventory item"} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center px-4 text-center text-[10.5px] text-[#7a90a8]">{selectedItem ? "No photo uploaded" : "Save the item before attaching files"}</div>
                                        )}
                                    </div>
                                    <input ref={primaryPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, "photo", true); event.currentTarget.value = ""; }} />
                                </div>

                                <div className="rounded-[15px] border border-white/[0.78] bg-white/[0.54] p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-[10px] font-semibold text-[#0b1623]">Warranty card / document</div>
                                            <div className="mt-0.5 text-[9.5px] text-[#7a90a8]">PDF or image, stored privately.</div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!selectedItem || saving}
                                            onClick={() => warrantyInputRef.current?.click()}
                                            className="rounded-[10px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-[#0f7448] disabled:opacity-40"
                                        >
                                            Upload
                                        </button>
                                    </div>
                                    <div className="mt-2.5 space-y-1.5">
                                        {documents.filter((attachment) => attachment.attachment_type === "warranty_card").length === 0 ? (
                                            <div className="flex h-32 items-center justify-center rounded-[12px] border border-dashed border-[#c4d1df] bg-white/[0.36] px-4 text-center text-[10.5px] text-[#7a90a8]">No warranty document uploaded</div>
                                        ) : documents.filter((attachment) => attachment.attachment_type === "warranty_card").map((attachment) => (
                                            <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => void removeAttachment(attachment)} />
                                        ))}
                                    </div>
                                    <input ref={warrantyInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, "warranty_card"); event.currentTarget.value = ""; }} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowAdvanced((value) => !value)}
                                className="flex w-full items-center justify-between rounded-[13px] border border-[#ccd9e8] bg-white/[0.56] px-3 py-2.5 text-left transition hover:bg-white/[0.78]"
                            >
                                <span>
                                    <span className="block text-[11px] font-semibold text-[#0b1623]">Advanced details</span>
                                    <span className="mt-0.5 block text-[9.5px] text-[#7a90a8]">Brand, model, serial number, purchase data, lifecycle and extra files.</span>
                                </span>
                                <span className="text-[16px] text-[#607993]">{showAdvanced ? "−" : "+"}</span>
                            </button>

                            {showAdvanced ? (
                                <div className="space-y-3 rounded-[15px] border border-white/[0.78] bg-white/[0.46] p-3">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        <TextField label="Quantity" type="number" value={draft.quantity} onChange={(value) => setDraft((current) => ({ ...current, quantity: Math.max(1, Number(value || 1)) }))} />
                                        <TextField label="Brand" value={draft.brand} onChange={(value) => setDraft((current) => ({ ...current, brand: value }))} />
                                        <TextField label="Model" value={draft.model} onChange={(value) => setDraft((current) => ({ ...current, model: value }))} />
                                        <TextField label="Serial number" value={draft.serial_number} onChange={(value) => setDraft((current) => ({ ...current, serial_number: value }))} />
                                        <DateField label="Purchase date" value={draft.purchase_date} onChange={(value) => setDraft((current) => ({ ...current, purchase_date: value }))} />
                                        <DateField label="Warranty start" value={draft.warranty_start_date} onChange={(value) => setDraft((current) => ({ ...current, warranty_start_date: value }))} />
                                        <SelectField label="Lifecycle status" value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={STATUS_OPTIONS} />
                                    </div>
                                    <label className="block">
                                        <FieldLabel>Notes</FieldLabel>
                                        <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] text-[#0b1623] outline-none focus:border-[#2f80ed]/50" />
                                    </label>

                                    {selectedItem ? (
                                        <div>
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <div className="text-[10px] font-semibold text-[#0b1623]">Additional files</div>
                                                    <div className="mt-0.5 text-[9.5px] text-[#7a90a8]">Extra photos, invoices, manuals or supporting documents.</div>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <select value={extraAttachmentType} onChange={(event) => setExtraAttachmentType(event.target.value as ManagedPropertyInventoryAttachmentType)} className="h-8 rounded-[10px] border border-[#ccd9e8] bg-white/[0.76] px-2 text-[10px] font-semibold text-[#607993]">
                                                        {(["photo", "invoice", "manual", "other"] as ManagedPropertyInventoryAttachmentType[]).map((type) => <option key={type} value={type}>{ATTACHMENT_LABELS[type]}</option>)}
                                                    </select>
                                                    <button type="button" disabled={saving} onClick={() => extraAttachmentInputRef.current?.click()} className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 text-[10px] font-semibold text-[#1560bc] disabled:opacity-40">Upload</button>
                                                </div>
                                            </div>
                                            <input ref={extraAttachmentInputRef} type="file" accept={extraAttachmentType === "photo" ? "image/jpeg,image/png,image/webp,image/avif" : "image/jpeg,image/png,image/webp,image/avif,application/pdf"} className="hidden" onChange={(event) => { void uploadAttachment(event.target.files?.[0] ?? null, extraAttachmentType); event.currentTarget.value = ""; }} />

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {photos.map((attachment) => (
                                                    <div key={attachment.id} className="rounded-[12px] border border-[#d4dfeb] bg-white/[0.62] p-2">
                                                        <div className="h-24 overflow-hidden rounded-[9px] bg-[#eef3f8]">
                                                            {signedUrls[attachment.storage_path] ? <img src={signedUrls[attachment.storage_path]} alt="" className="h-full w-full object-cover" /> : null}
                                                        </div>
                                                        <div className="mt-1.5 flex items-center justify-between gap-2">
                                                            <span className="truncate text-[9.5px] text-[#607993]">{attachment.file_name}</span>
                                                            <div className="flex gap-1">
                                                                {!attachment.is_primary ? <button type="button" onClick={() => void makePrimary(attachment)} className="text-[9px] font-semibold text-[#1560bc]">Primary</button> : <span className="text-[8.5px] font-semibold text-[#0f7448]">Primary</span>}
                                                                <button type="button" onClick={() => void removeAttachment(attachment)} className="text-[9px] font-semibold text-[#9d2f2f]">Delete</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {documents.filter((attachment) => attachment.attachment_type !== "warranty_card").map((attachment) => (
                                                    <AttachmentRow key={attachment.id} attachment={attachment} signedUrl={signedUrls[attachment.storage_path]} onDelete={() => void removeAttachment(attachment)} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dbe4ee] pt-3">
                                <div>
                                    {selectedItem ? (
                                        <button type="button" disabled={saving} onClick={() => void removeItem()} className="rounded-[11px] border border-[#d96969]/[0.26] bg-[#d96969]/[0.08] px-3 py-2 text-[10.5px] font-semibold text-[#9d2f2f] disabled:opacity-40">Delete item</button>
                                    ) : <span className="text-[9.5px] text-[#7a90a8]">Save first, then attach photos and documents.</span>}
                                </div>
                                <div className="flex gap-2">
                                    {selectedId === "new" ? (
                                        <button type="button" disabled={saving} onClick={() => { const fallback = bundle.inventoryItems[0]; setSelectedId(fallback?.id ?? null); setDraft(fallback ? inventoryToDraft(fallback) : newInventoryDraft()); }} className="rounded-[11px] border border-[#ccd9e8] bg-white/[0.66] px-3.5 py-2 text-[10.5px] font-semibold text-[#607993] disabled:opacity-40">Cancel</button>
                                    ) : null}
                                    <button type="button" disabled={saving} onClick={() => void saveItem()} className="rounded-[11px] border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.12] px-4 py-2 text-[10.5px] font-semibold text-[#1560bc] shadow-[0_8px_20px_rgba(47,128,237,0.10)] transition hover:bg-[#2f80ed]/[0.18] disabled:opacity-40">{saving ? "Saving..." : selectedId === "new" ? "Create item" : "Save changes"}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
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
        <div className="flex items-center gap-2 rounded-[11px] border border-[#d4dfeb] bg-white/[0.62] px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#eef3f8] text-[9px] font-bold uppercase text-[#607993]">{attachment.mime_type === "application/pdf" ? "PDF" : "FILE"}</div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold text-[#0b1623]">{attachment.title || attachment.file_name}</div>
                <div className="mt-0.5 text-[8.5px] text-[#7a90a8]">{ATTACHMENT_LABELS[attachment.attachment_type]} · {formatFileSize(attachment.file_size_bytes)}</div>
            </div>
            <div className="flex gap-1.5">
                {signedUrl ? <a href={signedUrl} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-[#1560bc]">Open</a> : null}
                <button type="button" onClick={onDelete} className="text-[9px] font-semibold text-[#9d2f2f]">Delete</button>
            </div>
        </div>
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
    const [selectedId, setSelectedId] = useState<string | null>(bundle.galleryItems[0]?.id ?? null);
    const [draft, setDraft] = useState<GalleryDraft>(() => {
        const first = bundle.galleryItems[0];
        return first ? galleryToDraft(first) : newGalleryDraft();
    });
    const [showUploader, setShowUploader] = useState(false);
    const [uploadDraft, setUploadDraft] = useState<GalleryDraft>(newGalleryDraft);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const selected = bundle.galleryItems.find((item) => item.id === selectedId);
        if (selected) {
            setDraft(galleryToDraft(selected));
            return;
        }
        const fallback = bundle.galleryItems[0];
        setSelectedId(fallback?.id ?? null);
        setDraft(fallback ? galleryToDraft(fallback) : newGalleryDraft());
    }, [bundle.galleryItems, selectedId]);

    const filteredItems = useMemo(() => {
        return filter === "all" ? bundle.galleryItems : bundle.galleryItems.filter((item) => item.gallery_type === filter);
    }, [bundle.galleryItems, filter]);

    const selectedItem = bundle.galleryItems.find((item) => item.id === selectedId) ?? null;

    function selectGalleryItem(item: ManagedPropertyGalleryItem) {
        setSelectedId(item.id);
        setDraft(galleryToDraft(item));
        setError(null);
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
            const reloadedItem = firstCreatedId
                ? loaded?.next.galleryItems.find((item) => item.id === firstCreatedId) ?? null
                : null;
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

    return (
        <SectionShell
            eyebrow="Visual archive"
            title="Gallery"
            subtitle="Private interior and exterior photo archive. Use one cover image, organize by room or area, and drag thumbnails to change their order."
            action={(
                <button type="button" disabled={saving} onClick={() => setShowUploader((value) => !value)} className="rounded-[11px] border border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.10] px-3.5 py-2 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.16] disabled:opacity-50">
                    {showUploader ? "Close uploader" : "+ Add photos"}
                </button>
            )}
        >
            {showUploader ? (
                <div className="mb-3 rounded-[16px] border border-[#2f80ed]/[0.18] bg-[#2f80ed]/[0.055] p-3.5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <SelectField label="Type" value={uploadDraft.gallery_type} onChange={(value) => setUploadDraft((current) => ({ ...current, gallery_type: value }))} options={[{ value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" }]} />
                        <TextField label="Room / area" value={uploadDraft.room_area} onChange={(value) => setUploadDraft((current) => ({ ...current, room_area: value }))} placeholder="Living room, facade..." />
                        <DateField label="Photo date" value={uploadDraft.photo_date} onChange={(value) => setUploadDraft((current) => ({ ...current, photo_date: value }))} />
                        <TextField label="Caption" value={uploadDraft.caption} onChange={(value) => setUploadDraft((current) => ({ ...current, caption: value }))} placeholder="Optional shared caption" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-dashed border-[#aebfd1] bg-white/[0.44] px-3 py-3">
                        <div>
                            <div className="text-[10.5px] font-semibold text-[#0b1623]">{uploadFiles.length ? `${uploadFiles.length} photo${uploadFiles.length === 1 ? "" : "s"} selected` : "Choose one or more images"}</div>
                            <div className="mt-0.5 text-[9px] text-[#7a90a8]">JPEG, PNG, WebP or AVIF · max 25 MB per file</div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" disabled={saving} onClick={() => galleryInputRef.current?.click()} className="rounded-[10px] border border-[#ccd9e8] bg-white/[0.74] px-3 py-2 text-[10px] font-semibold text-[#607993] disabled:opacity-40">Choose files</button>
                            <button type="button" disabled={saving || uploadFiles.length === 0} onClick={() => void uploadPhotos()} className="rounded-[10px] border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.12] px-3.5 py-2 text-[10px] font-semibold text-[#1560bc] disabled:opacity-40">{saving ? "Uploading..." : "Upload"}</button>
                        </div>
                        <input ref={galleryInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))} />
                    </div>
                </div>
            ) : null}

            <div className="mb-3 flex gap-1.5">
                {(["all", "interior", "exterior"] as const).map((value) => (
                    <button key={value} type="button" onClick={() => setFilter(value)} className={["rounded-full border px-3 py-1.5 text-[9.5px] font-semibold capitalize transition", filter === value ? "border-[#2f80ed]/[0.32] bg-[#2f80ed]/[0.12] text-[#1560bc]" : "border-[#ccd9e8] bg-white/[0.58] text-[#607993] hover:bg-white"].join(" ")}>{value}</button>
                ))}
            </div>

            <div className="grid min-h-[500px] gap-3 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="rounded-[17px] border border-white/[0.76] bg-white/[0.48] p-3">
                    {filteredItems.length === 0 ? (
                        <div className="flex min-h-[460px] items-center justify-center rounded-[15px] border border-dashed border-[#b8c8da] bg-white/[0.32] px-6 text-center text-[12px] text-[#7a90a8]">No photos in this view.</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-4">
                            {filteredItems.map((item) => {
                                const active = item.id === selectedId;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        draggable
                                        onDragStart={() => setDraggedId(item.id)}
                                        onDragEnd={() => setDraggedId(null)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => { if (draggedId) void reorderGallery(draggedId, item.id); }}
                                        onClick={() => selectGalleryItem(item)}
                                        className={["group overflow-hidden rounded-[14px] border text-left transition", active ? "border-[#2f80ed]/[0.42] bg-[#2f80ed]/[0.08] shadow-[0_12px_30px_rgba(47,128,237,0.13)]" : "border-white/[0.76] bg-white/[0.56] hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.24] hover:bg-white/[0.80]"].join(" ")}
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-[#eef3f8]">
                                            {signedUrls[item.storage_path] ? <img src={signedUrls[item.storage_path]} alt={item.caption || item.room_area || "Property photo"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" /> : null}
                                            <div className="absolute left-2 top-2 flex gap-1">
                                                <span className="rounded-full border border-white/[0.72] bg-[#07111f]/[0.62] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">{item.gallery_type}</span>
                                                {item.is_cover ? <span className="rounded-full border border-[#e2c76c]/[0.72] bg-[#7d6620]/[0.72] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">Cover</span> : null}
                                            </div>
                                        </div>
                                        <div className="p-2.5">
                                            <div className="truncate text-[10.5px] font-semibold text-[#0b1623]">{item.room_area || "Unspecified area"}</div>
                                            <div className="mt-0.5 truncate text-[9px] text-[#7a90a8]">{item.caption || formatDate(item.photo_date)}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-[17px] border border-white/[0.76] bg-white/[0.48] p-3.5">
                    {!selectedItem ? (
                        <div className="flex min-h-[460px] items-center justify-center rounded-[15px] border border-dashed border-[#b8c8da] bg-white/[0.32] px-6 text-center text-[12px] text-[#7a90a8]">Select a photo to view and edit its details.</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="overflow-hidden rounded-[14px] border border-[#d4dfeb] bg-[#eef3f8]">
                                {signedUrls[selectedItem.storage_path] ? <img src={signedUrls[selectedItem.storage_path]} alt={selectedItem.caption || "Property photo"} className="max-h-[270px] w-full object-contain" /> : <div className="flex h-48 items-center justify-center text-[10px] text-[#7a90a8]">Preview unavailable</div>}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="truncate text-[11px] font-semibold text-[#0b1623]">{selectedItem.file_name}</div>
                                    <div className="mt-0.5 text-[8.5px] text-[#7a90a8]">{formatFileSize(selectedItem.file_size_bytes)} · {formatDate(selectedItem.photo_date)}</div>
                                </div>
                                {selectedItem.is_cover ? <span className="rounded-full border border-[#d6a92d]/[0.28] bg-[#d6a92d]/[0.12] px-2.5 py-1 text-[8.5px] font-semibold text-[#8a6511]">Current cover</span> : null}
                            </div>

                            <SelectField label="Type" value={draft.gallery_type} onChange={(value) => setDraft((current) => ({ ...current, gallery_type: value }))} options={[{ value: "interior", label: "Interior" }, { value: "exterior", label: "Exterior" }]} />
                            <TextField label="Room / area" value={draft.room_area} onChange={(value) => setDraft((current) => ({ ...current, room_area: value }))} />
                            <DateField label="Photo date" value={draft.photo_date} onChange={(value) => setDraft((current) => ({ ...current, photo_date: value }))} />
                            <label className="block">
                                <FieldLabel>Caption</FieldLabel>
                                <textarea value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} rows={3} className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] text-[#0b1623] outline-none focus:border-[#2f80ed]/50" />
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dbe4ee] pt-3">
                                <div className="flex gap-2">
                                    <button type="button" disabled={saving} onClick={() => void removeGalleryItem(selectedItem)} className="rounded-[10px] border border-[#d96969]/[0.26] bg-[#d96969]/[0.08] px-2.5 py-1.5 text-[9.5px] font-semibold text-[#9d2f2f] disabled:opacity-40">Delete</button>
                                    {signedUrls[selectedItem.storage_path] ? <a href={signedUrls[selectedItem.storage_path]} target="_blank" rel="noreferrer" className="rounded-[10px] border border-[#ccd9e8] bg-white/[0.68] px-2.5 py-1.5 text-[9.5px] font-semibold text-[#607993]">Open original</a> : null}
                                </div>
                                <div className="flex gap-2">
                                    {!selectedItem.is_cover ? <button type="button" disabled={saving} onClick={() => void makeCover(selectedItem)} className="rounded-[10px] border border-[#d6a92d]/[0.28] bg-[#d6a92d]/[0.10] px-2.5 py-1.5 text-[9.5px] font-semibold text-[#8a6511] disabled:opacity-40">Set cover</button> : null}
                                    <button type="button" disabled={saving} onClick={() => void saveGalleryItem()} className="rounded-[10px] border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.12] px-3 py-1.5 text-[9.5px] font-semibold text-[#1560bc] disabled:opacity-40">{saving ? "Saving..." : "Save"}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SectionShell>
    );
}
