"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import Unit19ModalSwitcher, { type Unit19PanelKey } from "@/components/admin/Unit19ModalSwitcher";
import {
    createManagedPropertyExpense,
    createManagedPropertyRealEstateContact,
    createManagedPropertyRealEstateCost,
    createManagedPropertyServiceAccount,
    deleteManagedPropertyRealEstateContact,
    deleteManagedPropertyRealEstateCost,
    deleteManagedPropertyServiceAccount,
    getManagedPropertyBySlug,
    getManagedPropertyExpenses,
    getManagedPropertyIncome,
    getManagedPropertyRealEstate,
    updateManagedPropertyExpense,
    updateManagedPropertyRealEstateContact,
    updateManagedPropertyRealEstateCost,
    updateManagedPropertyServiceAccount,
    upsertManagedPropertyRealEstateProfile,
    type ManagedProperty,
    type ManagedPropertyExpense,
    type ManagedPropertyRealEstateContact,
    type ManagedPropertyRealEstateContactType,
    type ManagedPropertyRealEstateCost,
    type ManagedPropertyRealEstateCostCategory,
    type ManagedPropertyRealEstateProfile,
    type ManagedPropertyServiceAccount,
    type ManagedPropertyServiceType,
} from "@/lib/admin/managedPropertiesApi";

const PROPERTY_SLUG = "unit-19";
const EUR_TO_BGN = 1.95583;

const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

function formatEur(value: number | null | undefined) {
    return currency.format(Number(value ?? 0));
}

function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function blankToNull(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

type Props = {
    open: boolean;
    onClose: () => void;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
    propertySlug?: string;
    projectLabel?: string;
};

type ProfileDraft = {
    owner_afm: string;
    tax_portal_username: string;
    tax_portal_password_ref: string;
    atak: string;
    pea_number: string;
    rental_contract_reference: string;
    kaek: string;
    google_maps_url: string;
    property_image_url: string;
    size_sqm: number;
    address_en: string;
    address_local: string;
    acquisition_date: string;
    purchase_price_eur: number;
    credit_amount_eur: number;
    self_participation_eur: number;
    acquisition_notes: string;
};

type CostDraft = {
    label: string;
    local_label: string;
    category: ManagedPropertyRealEstateCostCategory;
    amount_eur: number;
    rate_percent: number;
    vat_rate_percent: number;
    vat_included: boolean;
    include_in_total: boolean;
    note: string;
};

type ServiceDraft = {
    service_type: ManagedPropertyServiceType;
    provider_name: string;
    start_date: string;
    account_holder: string;
    account_number: string;
    meter_number: string;
    contract_number: string;
    customer_code: string;
    payment_code: string;
    delivery_point: string;
    plan_name: string;
    monthly_fee_eur: number;
    manager_name: string;
    manager_phone: string;
    manager_email: string;
    manager_bank_account: string;
    phone: string;
    website: string;
    note: string;
};

type ContactDraft = {
    contact_type: ManagedPropertyRealEstateContactType;
    full_name: string;
    afm: string;
    phone: string;
    email: string;
    iban: string;
    note: string;
};

const costCategoryLabels: Record<ManagedPropertyRealEstateCostCategory, string> = {
    price: "Price",
    tax: "Tax",
    broker: "Broker",
    legal: "Legal",
    notary: "Notary",
    registry: "Registry",
    cadastre: "Cadastre",
    financing: "Financing",
    other: "Other",
};

const costCategoryOrder: ManagedPropertyRealEstateCostCategory[] = ["price", "tax", "broker", "legal", "notary", "registry", "cadastre", "financing", "other"];

const serviceLabels: Record<ManagedPropertyServiceType, { label: string; local: string; helper: string }> = {
    electricity: {
        label: "Electricity",
        local: "Ηλεκτρικό ρεύμα",
        helper: "Ονοματεπώνυμο συμβαλλομένου · Αριθμός παροχής · Αριθμός Μετρητή · Λογαριασμός συμβολαίου",
    },
    water: {
        label: "Water",
        local: "Ύδρευση",
        helper: "Ονοματεπώνυμο συμβαλλομένου · Αριθμός παροχής · Αριθμός υδρομέτρου",
    },
    gas: {
        label: "Gas",
        local: "Φυσικό αέριο",
        helper: "Κωδικός πελάτη · Ηλεκτρονικός κωδικός πληρωμής · Αριθμός Μετρητή · HKASP",
    },
    internet_tv: {
        label: "Internet / TV",
        local: "Internet / TV",
        helper: "Provider · start date · account holder · subscription plan",
    },
    building_fees: {
        label: "Building fees / elevator",
        local: "Κοινόχρηστα / ασανσέρ",
        helper: "Monthly fee · building manager · phone · email · bank account",
    },
    other: {
        label: "Other service",
        local: "Άλλη υπηρεσία",
        helper: "Custom service account",
    },
};

const contactLabels: Record<ManagedPropertyRealEstateContactType, string> = {
    tenant: "Tenant",
    previous_owner: "Previous owner",
    property_manager: "Property manager",
    other: "Other",
};

function profileToDraft(profile: ManagedPropertyRealEstateProfile | null, property: ManagedProperty | null): ProfileDraft {
    return {
        owner_afm: profile?.owner_afm ?? "",
        tax_portal_username: profile?.tax_portal_username ?? "",
        tax_portal_password_ref: profile?.tax_portal_password_ref ?? "",
        atak: profile?.atak ?? "",
        pea_number: profile?.pea_number ?? "",
        rental_contract_reference: profile?.rental_contract_reference ?? "",
        kaek: profile?.kaek ?? "",
        google_maps_url: profile?.google_maps_url ?? "",
        property_image_url: profile?.property_image_url ?? "",
        size_sqm: Number(profile?.size_sqm ?? 0),
        address_en: profile?.address_en ?? property?.address ?? "",
        address_local: profile?.address_local ?? "",
        acquisition_date: profile?.acquisition_date ?? property?.acquisition_date ?? "",
        purchase_price_eur: Number(profile?.purchase_price_eur ?? 0),
        credit_amount_eur: Number(profile?.credit_amount_eur ?? 0),
        self_participation_eur: Number(profile?.self_participation_eur ?? 0),
        acquisition_notes: profile?.acquisition_notes ?? "",
    };
}

function costToDraft(cost: ManagedPropertyRealEstateCost): CostDraft {
    return {
        label: cost.label ?? "",
        local_label: cost.local_label ?? "",
        category: cost.category,
        amount_eur: Number(cost.amount_eur ?? 0),
        rate_percent: Number(cost.rate_percent ?? 0),
        vat_rate_percent: Number(cost.vat_rate_percent ?? 0),
        vat_included: Boolean(cost.vat_included),
        include_in_total: cost.include_in_total ?? true,
        note: cost.note ?? "",
    };
}

function serviceToDraft(service: ManagedPropertyServiceAccount): ServiceDraft {
    return {
        service_type: service.service_type,
        provider_name: service.provider_name ?? "",
        start_date: service.start_date ?? "",
        account_holder: service.account_holder ?? "",
        account_number: service.account_number ?? "",
        meter_number: service.meter_number ?? "",
        contract_number: service.contract_number ?? "",
        customer_code: service.customer_code ?? "",
        payment_code: service.payment_code ?? "",
        delivery_point: service.delivery_point ?? "",
        plan_name: service.plan_name ?? "",
        monthly_fee_eur: Number(service.monthly_fee_eur ?? 0),
        manager_name: service.manager_name ?? "",
        manager_phone: service.manager_phone ?? "",
        manager_email: service.manager_email ?? "",
        manager_bank_account: service.manager_bank_account ?? "",
        phone: service.phone ?? "",
        website: service.website ?? "",
        note: service.note ?? "",
    };
}

function contactToDraft(contact: ManagedPropertyRealEstateContact): ContactDraft {
    return {
        contact_type: contact.contact_type,
        full_name: contact.full_name ?? "",
        afm: contact.afm ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        iban: contact.iban ?? "",
        note: contact.note ?? "",
    };
}

type PropertySectionKey = "overview" | "services" | "costs" | "people";
type AddressLanguage = "en" | "local";

type Unit19CreditConfig = {
    marker: "unit19_credit_v1";
    payment_eur: number;
    start_month: number;
    end_month: number;
    life_insurance_eur: number;
    property_insurance_eur: number;
    property_insurance_month: number;
};

type BudgetSummary = {
    yearlyRentScheduled: number;
    monthlyRentEstimate: number;
    yearlyRentCollected: number;
    creditPaymentEur: number;
    lifeInsuranceEur: number;
    propertyInsuranceEur: number;
    propertyInsuranceMonth: number;
};

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function parseUnit19CreditConfig(note: string | null | undefined): Unit19CreditConfig {
    const parsed = parseJsonObject(note);
    if (parsed?.marker === "unit19_credit_v1") {
        return {
            marker: "unit19_credit_v1",
            payment_eur: Number(parsed.payment_eur ?? 0),
            start_month: Number(parsed.start_month ?? 1),
            end_month: Number(parsed.end_month ?? 12),
            life_insurance_eur: Number(parsed.life_insurance_eur ?? 0),
            property_insurance_eur: Number(parsed.property_insurance_eur ?? 0),
            property_insurance_month: Number(parsed.property_insurance_month ?? 1),
        };
    }

    return {
        marker: "unit19_credit_v1",
        payment_eur: 0,
        start_month: 1,
        end_month: 12,
        life_insurance_eur: 0,
        property_insurance_eur: 0,
        property_insurance_month: 1,
    };
}

function IconBuilding() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 21V5.8c0-.7.5-1.3 1.2-1.4l8-1.8c.9-.2 1.8.5 1.8 1.4V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16 9h2.8c.7 0 1.2.5 1.2 1.2V21M3 21h18M8.5 8h3M8.5 12h3M8.5 16h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{label}</span>
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

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 py-2 text-[12px] font-medium leading-[1.45] text-[#0b1623] outline-none transition focus:border-[#2f80ed]/50 focus:bg-white"
            />
        </label>
    );
}

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
    return (
        <section className="rounded-[20px] border border-white/[0.80] bg-white/[0.58] p-4 shadow-[0_16px_46px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2f80ed]">{title}</div>
                    {subtitle ? <div className="mt-1 text-[12px] text-[#7a90a8]">{subtitle}</div> : null}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function Unit19RealEstateModal({ open, onClose, onSwitchPanel, propertySlug = PROPERTY_SLUG, projectLabel = "Unit 19" }: Props) {
    const [managedProperty, setManagedProperty] = useState<ManagedProperty | null>(null);
    const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => profileToDraft(null, null));
    const [profileSavedDraft, setProfileSavedDraft] = useState<ProfileDraft>(() => profileToDraft(null, null));
    const [costs, setCosts] = useState<ManagedPropertyRealEstateCost[]>([]);
    const [services, setServices] = useState<ManagedPropertyServiceAccount[]>([]);
    const [contacts, setContacts] = useState<ManagedPropertyRealEstateContact[]>([]);
    const [expenses, setExpenses] = useState<ManagedPropertyExpense[]>([]);
    const [costDrafts, setCostDrafts] = useState<Record<string, CostDraft>>({});
    const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
    const [contactDrafts, setContactDrafts] = useState<Record<string, ContactDraft>>({});
    const [showSecretRef, setShowSecretRef] = useState(false);
    const [showMapLinkEditor, setShowMapLinkEditor] = useState(false);
    const [activeSection, setActiveSection] = useState<PropertySectionKey>("overview");
    const [addressLanguage, setAddressLanguage] = useState<AddressLanguage>("en");
    const [expandedServiceIds, setExpandedServiceIds] = useState<Set<string>>(() => new Set());
    const [expandedCostIds, setExpandedCostIds] = useState<Set<string>>(() => new Set());
    const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(() => new Set());
    const [draggedCostId, setDraggedCostId] = useState<string | null>(null);
    const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
    const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
    const newItemRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({
        yearlyRentScheduled: 0,
        monthlyRentEstimate: 0,
        yearlyRentCollected: 0,
        creditPaymentEur: 0,
        lifeInsuranceEur: 0,
        propertyInsuranceEur: 0,
        propertyInsuranceMonth: 1,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const expenseById = useMemo(() => {
        return new Map(expenses.map((expense) => [expense.id, expense]));
    }, [expenses]);

    const effectiveCostAmount = useCallback((cost: ManagedPropertyRealEstateCost) => {
        if (cost.include_in_total === false) return 0;

        if (cost.expense_id) {
            const expense = expenseById.get(cost.expense_id);
            if (expense && expense.status !== "excluded") return Number(expense.amount_eur ?? 0);
        }
        return Number(cost.amount_eur ?? 0);
    }, [expenseById]);

    const transactionCosts = useMemo(() => {
        return costs
            .filter((cost) => !["price", "financing"].includes(cost.category))
            .reduce((sum, cost) => sum + effectiveCostAmount(cost), 0);
    }, [costs, effectiveCostAmount]);

    const purchasePrice = Number(profileDraft.purchase_price_eur || costs.find((cost) => cost.stable_key === "purchase_price")?.amount_eur || 0);
    const sizeSqm = Number(profileDraft.size_sqm || 0);
    const pricePerSqm = sizeSqm > 0 ? purchasePrice / sizeSqm : 0;
    const creditAmount = Number(profileDraft.credit_amount_eur || costs.find((cost) => cost.stable_key === "credit_amount")?.amount_eur || 0);
    const selfParticipation = Number(profileDraft.self_participation_eur || costs.find((cost) => cost.stable_key === "self_participation")?.amount_eur || 0);
    const totalAcquisition = purchasePrice + transactionCosts;
    const serviceMonthly = services.reduce((sum, service) => sum + Number(service.monthly_fee_eur ?? 0), 0);
    const servicesReady = services.filter((service) => service.provider_name || service.account_number || service.meter_number || service.customer_code).length;
    const profileIsDirty = useMemo(() => JSON.stringify(profileDraft) !== JSON.stringify(profileSavedDraft), [profileDraft, profileSavedDraft]);

    async function loadData() {
        if (!open) return;

        setLoading(true);
        setError(null);

        try {
            const property = await getManagedPropertyBySlug(propertySlug);
            const currentYear = new Date().getFullYear();
            const [bundle, propertyExpenses, incomeBundle] = await Promise.all([
                getManagedPropertyRealEstate(property.id),
                getManagedPropertyExpenses(property.id),
                getManagedPropertyIncome(property.id, currentYear),
            ]);

            setManagedProperty(property);
            const loadedProfileDraft = profileToDraft(bundle.profile, property);
            setProfileDraft(loadedProfileDraft);
            setProfileSavedDraft(loadedProfileDraft);
            setCosts(bundle.costs);
            setServices(bundle.serviceAccounts);
            setContacts(bundle.contacts);
            setExpenses(propertyExpenses);
            setCostDrafts(Object.fromEntries(bundle.costs.map((cost) => [cost.id, costToDraft(cost)])));
            setServiceDrafts(Object.fromEntries(bundle.serviceAccounts.map((service) => [service.id, serviceToDraft(service)])));
            setContactDrafts(Object.fromEntries(bundle.contacts.map((contact) => [contact.id, contactToDraft(contact)])));
            const creditConfig = parseUnit19CreditConfig(incomeBundle.taxReserve?.note);
            const scheduledMonths = incomeBundle.months.filter((month) => Number(month.rent_expected_eur ?? 0) > 0);
            const yearlyRentScheduled = incomeBundle.months.reduce((sum, month) => sum + Number(month.rent_expected_eur ?? 0), 0);
            const yearlyRentCollected = incomeBundle.months.reduce((sum, month) => sum + Number(month.rent_paid_eur ?? 0), 0);
            const monthlyRentEstimate = scheduledMonths.length > 0 ? yearlyRentScheduled / scheduledMonths.length : 0;
            setBudgetSummary({
                yearlyRentScheduled,
                monthlyRentEstimate,
                yearlyRentCollected,
                creditPaymentEur: creditConfig.payment_eur,
                lifeInsuranceEur: creditConfig.life_insurance_eur,
                propertyInsuranceEur: creditConfig.property_insurance_eur,
                propertyInsuranceMonth: creditConfig.property_insurance_month,
            });
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to load real estate data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, propertySlug]);

    if (!open) return null;

    async function saveProfile() {
        if (!managedProperty) return;

        setSaving(true);
        setError(null);

        try {
            const saved = await upsertManagedPropertyRealEstateProfile(managedProperty.id, {
                owner_afm: blankToNull(profileDraft.owner_afm),
                tax_portal_username: blankToNull(profileDraft.tax_portal_username),
                tax_portal_password_ref: blankToNull(profileDraft.tax_portal_password_ref),
                atak: blankToNull(profileDraft.atak),
                pea_number: blankToNull(profileDraft.pea_number),
                rental_contract_reference: blankToNull(profileDraft.rental_contract_reference),
                kaek: blankToNull(profileDraft.kaek),
                google_maps_url: blankToNull(profileDraft.google_maps_url),
                property_image_url: blankToNull(profileDraft.property_image_url),
                size_sqm: profileDraft.size_sqm || null,
                address_en: blankToNull(profileDraft.address_en),
                address_local: blankToNull(profileDraft.address_local),
                acquisition_date: blankToNull(profileDraft.acquisition_date),
                purchase_price_eur: profileDraft.purchase_price_eur,
                credit_amount_eur: profileDraft.credit_amount_eur,
                self_participation_eur: profileDraft.self_participation_eur,
                acquisition_notes: blankToNull(profileDraft.acquisition_notes),
            });
            const purchasePriceCost = costs.find((cost) => cost.stable_key === "purchase_price");
            if (purchasePriceCost && Number(purchasePriceCost.amount_eur ?? 0) !== Number(profileDraft.purchase_price_eur ?? 0)) {
                const updatedPurchaseCost = await updateManagedPropertyRealEstateCost(purchasePriceCost.id, {
                    amount_eur: Number(profileDraft.purchase_price_eur ?? 0),
                });
                setCosts((current) => current.map((cost) => (cost.id === updatedPurchaseCost.id ? updatedPurchaseCost : cost)));
                setCostDrafts((current) => ({ ...current, [updatedPurchaseCost.id]: costToDraft(updatedPurchaseCost) }));
            }

            const savedDraft = profileToDraft(saved, managedProperty);
            setProfileDraft(savedDraft);
            setProfileSavedDraft(savedDraft);
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save profile");
        } finally {
            setSaving(false);
        }
    }

    async function saveCost(cost: ManagedPropertyRealEstateCost) {
        const draft = costDrafts[cost.id];
        if (!draft) return;

        setSaving(true);
        setError(null);

        try {
            const amountEur = calculatedCostAmount(draft);
            let expenseId = cost.expense_id;
            if (expenseId) {
                const updatedExpense = await updateManagedPropertyExpense(expenseId, {
                    title: draft.label,
                    note: draft.note,
                    amount_eur: amountEur,
                    amount_bgn: Number((amountEur * EUR_TO_BGN).toFixed(2)),
                });
                setExpenses((current) => current.map((expense) => (expense.id === updatedExpense.id ? updatedExpense : expense)));
            } else if (!cost.stable_key.startsWith("purchase_price") && !cost.stable_key.includes("credit") && !cost.stable_key.includes("self_participation")) {
                const newExpense = await createManagedPropertyExpense({
                    managed_property_id: cost.managed_property_id,
                    title: draft.label,
                    category: "greek_closing",
                    issuer: null,
                    note: draft.note,
                    amount_eur: amountEur,
                    amount_bgn: Number((amountEur * EUR_TO_BGN).toFixed(2)),
                    fx_rate: EUR_TO_BGN,
                    expense_date: null,
                    status: "planned",
                    source: `real-estate:${cost.stable_key}`,
                    sort_order: 900 + costs.length,
                });
                expenseId = newExpense.id;
                setExpenses((current) => [...current, newExpense]);
            }

            const saved = await updateManagedPropertyRealEstateCost(cost.id, {
                ...draft,
                amount_eur: amountEur,
                local_label: blankToNull(draft.local_label),
                note: blankToNull(draft.note),
                expense_id: expenseId,
                rate_percent: draft.rate_percent || null,
                vat_rate_percent: draft.vat_rate_percent || null,
                include_in_total: draft.include_in_total,
            });

            setCosts((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            setCostDrafts((current) => ({ ...current, [saved.id]: costToDraft(saved) }));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save cost");
        } finally {
            setSaving(false);
        }
    }

    async function addCost() {
        if (!managedProperty) return;

        setSaving(true);
        setError(null);

        try {
            const sortOrder = Math.max(0, ...costs.map((cost) => cost.sort_order)) + 10;
            const stableKey = `custom-${Date.now()}`;
            const expense = await createManagedPropertyExpense({
                managed_property_id: managedProperty.id,
                title: "New real estate fee",
                category: "greek_closing",
                issuer: null,
                note: "Created from Real Estate cockpit.",
                amount_eur: 0,
                amount_bgn: 0,
                fx_rate: EUR_TO_BGN,
                expense_date: null,
                status: "planned",
                source: `real-estate:${stableKey}`,
                sort_order: 900 + sortOrder,
            });
            const cost = await createManagedPropertyRealEstateCost({
                managed_property_id: managedProperty.id,
                stable_key: stableKey,
                label: "New real estate fee",
                local_label: null,
                category: "other",
                amount_eur: 0,
                rate_percent: null,
                vat_rate_percent: null,
                vat_included: true,
                include_in_total: true,
                expense_id: expense.id,
                note: "Created from Real Estate cockpit.",
                sort_order: sortOrder,
            });
            setExpenses((current) => [...current, expense]);
            setCosts((current) => [...current, cost]);
            setCostDrafts((current) => ({ ...current, [cost.id]: costToDraft(cost) }));
            setExpandedCostIds((current) => new Set([...current, cost.id]));
            scrollNewItemIntoView();
            setExpandedCostIds((current) => new Set([...current, cost.id]));
            scrollNewItemIntoView();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to add cost");
        } finally {
            setSaving(false);
        }
    }

    async function removeCost(cost: ManagedPropertyRealEstateCost, options?: { skipConfirm?: boolean }) {
        if (!options?.skipConfirm && !window.confirm(`Delete ${cost.label}? The linked expense row is not deleted.`)) return;

        setSaving(true);
        setError(null);

        try {
            await deleteManagedPropertyRealEstateCost(cost.id);
            setCosts((current) => current.filter((item) => item.id !== cost.id));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete cost");
        } finally {
            setSaving(false);
        }
    }

    async function saveService(service: ManagedPropertyServiceAccount) {
        const draft = serviceDrafts[service.id];
        if (!draft) return;

        setSaving(true);
        setError(null);

        try {
            const saved = await updateManagedPropertyServiceAccount(service.id, {
                provider_name: blankToNull(draft.provider_name),
                start_date: blankToNull(draft.start_date),
                account_holder: blankToNull(draft.account_holder),
                account_number: blankToNull(draft.account_number),
                meter_number: blankToNull(draft.meter_number),
                contract_number: blankToNull(draft.contract_number),
                customer_code: blankToNull(draft.customer_code),
                payment_code: blankToNull(draft.payment_code),
                delivery_point: blankToNull(draft.delivery_point),
                plan_name: blankToNull(draft.plan_name),
                monthly_fee_eur: draft.monthly_fee_eur || null,
                manager_name: blankToNull(draft.manager_name),
                manager_phone: blankToNull(draft.manager_phone),
                manager_email: blankToNull(draft.manager_email),
                manager_bank_account: blankToNull(draft.manager_bank_account),
                phone: blankToNull(draft.phone),
                website: blankToNull(draft.website),
                note: blankToNull(draft.note),
            });
            setServices((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            setServiceDrafts((current) => ({ ...current, [saved.id]: serviceToDraft(saved) }));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save service account");
        } finally {
            setSaving(false);
        }
    }

    async function addService() {
        if (!managedProperty) return;

        setSaving(true);
        setError(null);

        try {
            const service = await createManagedPropertyServiceAccount({
                managed_property_id: managedProperty.id,
                service_type: "other",
                provider_name: "New service",
                start_date: null,
                account_holder: null,
                account_number: null,
                meter_number: null,
                contract_number: null,
                customer_code: null,
                payment_code: null,
                delivery_point: null,
                plan_name: null,
                monthly_fee_eur: null,
                manager_name: null,
                manager_phone: null,
                manager_email: null,
                manager_bank_account: null,
                phone: null,
                website: null,
                note: null,
                sort_order: Math.max(0, ...services.map((item) => item.sort_order)) + 10,
            });
            setServices((current) => [...current, service]);
            setServiceDrafts((current) => ({ ...current, [service.id]: serviceToDraft(service) }));
            setExpandedServiceIds((current) => new Set([...current, service.id]));
            scrollNewItemIntoView();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to add service account");
        } finally {
            setSaving(false);
        }
    }

    async function removeService(service: ManagedPropertyServiceAccount, options?: { skipConfirm?: boolean }) {
        if (!options?.skipConfirm && !window.confirm(`Delete ${service.provider_name || serviceLabels[service.service_type].label}?`)) return;

        setSaving(true);
        setError(null);

        try {
            await deleteManagedPropertyServiceAccount(service.id);
            setServices((current) => current.filter((item) => item.id !== service.id));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete service account");
        } finally {
            setSaving(false);
        }
    }

    async function saveContact(contact: ManagedPropertyRealEstateContact) {
        const draft = contactDrafts[contact.id];
        if (!draft) return;

        setSaving(true);
        setError(null);

        try {
            const saved = await updateManagedPropertyRealEstateContact(contact.id, {
                contact_type: draft.contact_type,
                full_name: draft.full_name,
                afm: blankToNull(draft.afm),
                phone: blankToNull(draft.phone),
                email: blankToNull(draft.email),
                iban: blankToNull(draft.iban),
                note: blankToNull(draft.note),
            });
            setContacts((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            setContactDrafts((current) => ({ ...current, [saved.id]: contactToDraft(saved) }));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to save contact");
        } finally {
            setSaving(false);
        }
    }

    async function addContact(contactType: ManagedPropertyRealEstateContactType) {
        if (!managedProperty) return;

        setSaving(true);
        setError(null);

        try {
            const contact = await createManagedPropertyRealEstateContact({
                managed_property_id: managedProperty.id,
                contact_type: contactType,
                full_name: "New contact",
                afm: null,
                phone: null,
                email: null,
                iban: null,
                note: null,
                sort_order: Math.max(0, ...contacts.map((item) => item.sort_order)) + 10,
            });
            setContacts((current) => [...current, contact]);
            setContactDrafts((current) => ({ ...current, [contact.id]: contactToDraft(contact) }));
            setExpandedContactIds((current) => new Set([...current, contact.id]));
            scrollNewItemIntoView();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to add contact");
        } finally {
            setSaving(false);
        }
    }

    async function removeContact(contact: ManagedPropertyRealEstateContact, options?: { skipConfirm?: boolean }) {
        if (!options?.skipConfirm && !window.confirm(`Delete ${contact.full_name || "contact"}?`)) return;

        setSaving(true);
        setError(null);

        try {
            await deleteManagedPropertyRealEstateContact(contact.id);
            setContacts((current) => current.filter((item) => item.id !== contact.id));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to delete contact");
        } finally {
            setSaving(false);
        }
    }

    function toggleService(serviceId: string) {
        setExpandedServiceIds((current) => {
            const next = new Set(current);
            if (next.has(serviceId)) next.delete(serviceId);
            else next.add(serviceId);
            return next;
        });
    }

    function toggleContact(contactId: string) {
        setExpandedContactIds((current) => {
            const next = new Set(current);
            if (next.has(contactId)) next.delete(contactId);
            else next.add(contactId);
            return next;
        });
    }

    function handleImageFile(file: File | null) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const value = typeof reader.result === "string" ? reader.result : "";
            if (value) setProfileDraft((draft) => ({ ...draft, property_image_url: value }));
        };
        reader.onerror = () => setError("Failed to read image file.");
        reader.readAsDataURL(file);
    }

    function calculatedCostAmount(draft: CostDraft) {
        const rate = Number(draft.rate_percent ?? 0);
        if (rate > 0) {
            let calculated = (purchasePrice * rate) / 100;
            const vatRate = Number(draft.vat_rate_percent ?? 0);
            if (vatRate > 0 && !draft.vat_included) calculated *= 1 + vatRate / 100;
            return Number(calculated.toFixed(2));
        }
        return Number(draft.amount_eur ?? 0);
    }

    function scrollNewItemIntoView() {
        window.setTimeout(() => newItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }

    function toggleCost(costId: string) {
        setExpandedCostIds((current) => {
            const next = new Set(current);
            if (next.has(costId)) next.delete(costId);
            else next.add(costId);
            return next;
        });
    }

    async function persistCostOrder(nextCosts: ManagedPropertyRealEstateCost[]) {
        const ordered = nextCosts.map((cost, index) => ({ ...cost, sort_order: (index + 1) * 10 }));
        setCosts(ordered);
        await Promise.all(ordered.map((cost) => updateManagedPropertyRealEstateCost(cost.id, { sort_order: cost.sort_order })));
    }

    async function persistServiceOrder(nextServices: ManagedPropertyServiceAccount[]) {
        const ordered = nextServices.map((service, index) => ({ ...service, sort_order: (index + 1) * 10 }));
        setServices(ordered);
        await Promise.all(ordered.map((service) => updateManagedPropertyServiceAccount(service.id, { sort_order: service.sort_order })));
    }

    async function persistContactOrder(nextContacts: ManagedPropertyRealEstateContact[]) {
        const ordered = nextContacts.map((contact, index) => ({ ...contact, sort_order: (index + 1) * 10 }));
        setContacts(ordered);
        await Promise.all(ordered.map((contact) => updateManagedPropertyRealEstateContact(contact.id, { sort_order: contact.sort_order })));
    }

    async function reorderCost(draggedId: string, targetId: string) {
        if (draggedId === targetId) return;
        const ordered = [...costs].sort((a, b) => a.sort_order - b.sort_order);
        const from = ordered.findIndex((item) => item.id === draggedId);
        const to = ordered.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return;
        const next = [...ordered];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        await persistCostOrder(next);
    }

    async function reorderService(draggedId: string, targetId: string) {
        if (draggedId === targetId) return;
        const ordered = [...services].sort((a, b) => a.sort_order - b.sort_order);
        const from = ordered.findIndex((item) => item.id === draggedId);
        const to = ordered.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return;
        const next = [...ordered];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        await persistServiceOrder(next);
    }

    async function reorderContact(draggedId: string, targetId: string) {
        if (draggedId === targetId) return;
        const ordered = [...contacts].sort((a, b) => a.sort_order - b.sort_order);
        const from = ordered.findIndex((item) => item.id === draggedId);
        const to = ordered.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return;
        const next = [...ordered];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        await persistContactOrder(next);
    }

    function cancelCost(cost: ManagedPropertyRealEstateCost) {
        if (cost.stable_key.startsWith("custom-") && Number(cost.amount_eur ?? 0) === 0) {
            void removeCost(cost, { skipConfirm: true });
            return;
        }
        setCostDrafts((current) => ({ ...current, [cost.id]: costToDraft(cost) }));
    }

    function cancelService(service: ManagedPropertyServiceAccount) {
        if (service.service_type === "other" && service.provider_name === "New service") {
            void removeService(service, { skipConfirm: true });
            return;
        }
        setServiceDrafts((current) => ({ ...current, [service.id]: serviceToDraft(service) }));
    }

    function cancelContact(contact: ManagedPropertyRealEstateContact) {
        if (contact.full_name === "New contact") {
            void removeContact(contact, { skipConfirm: true });
            return;
        }
        setContactDrafts((current) => ({ ...current, [contact.id]: contactToDraft(contact) }));
    }

    async function addCostFromExpense(expense: ManagedPropertyExpense) {
        if (!managedProperty) return;

        setSaving(true);
        setError(null);

        try {
            const sortOrder = Math.max(0, ...costs.map((cost) => cost.sort_order)) + 10;
            const cost = await createManagedPropertyRealEstateCost({
                managed_property_id: managedProperty.id,
                stable_key: `expense-${expense.id}`,
                label: expense.title,
                local_label: null,
                category: expense.category === "greek_closing" ? "other" : "other",
                amount_eur: Number(expense.amount_eur ?? 0),
                rate_percent: null,
                vat_rate_percent: null,
                vat_included: true,
                include_in_total: expense.category === "greek_closing",
                expense_id: expense.id,
                note: expense.note ?? `Linked from Expenses · ${expense.category}`,
                sort_order: sortOrder,
            });

            setCosts((current) => [...current, cost]);
            setCostDrafts((current) => ({ ...current, [cost.id]: costToDraft(cost) }));
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Failed to link expense");
        } finally {
            setSaving(false);
        }
    }

    const sections: Array<{ key: PropertySectionKey; label: string; helper: string }> = [
        { key: "overview", label: "Overview", helper: "Identity, price, rent and finance" },
        { key: "services", label: "Utilities and services", helper: `${servicesReady}/${Math.max(services.length, 1)} active records` },
        { key: "costs", label: "Acquisition costs", helper: formatEur(transactionCosts) },
        { key: "people", label: "People", helper: `${contacts.length} contacts` },
    ];

    const addressValue = addressLanguage === "en" ? profileDraft.address_en : profileDraft.address_local;
    const nonPriceCosts = costs.filter((cost) => cost.stable_key !== "purchase_price" && cost.category !== "price");
    const linkedExpenseIds = new Set(costs.map((cost) => cost.expense_id).filter(Boolean));
    const eligibleAcquisitionExpenses = expenses
        .filter((expense) => ["greek_closing", "greek_setup"].includes(expense.category))
        .filter((expense) => !linkedExpenseIds.has(expense.id))
        .filter((expense) => expense.status !== "excluded");

    const renderOverview = () => (
        <SectionCard
            title="Overview"
            subtitle="Focused asset identity with live Budget links for rent, credit and insurance."
            action={
                <button type="button" onClick={() => void saveProfile()} disabled={saving || !profileIsDirty} className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14] disabled:opacity-50">
                    Save overview
                </button>
            }
        >
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.28fr]">
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            handleImageFile(event.dataTransfer.files?.[0] ?? null);
                        }}
                        className="group block w-full overflow-hidden rounded-[18px] border border-white/[0.78] bg-white/[0.48] text-left shadow-[0_16px_42px_rgba(41,73,112,0.07)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.006] hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.68] hover:shadow-[0_22px_54px_rgba(41,73,112,0.12)]"
                    >
                        {profileDraft.property_image_url ? (
                            <div className="relative h-56 overflow-hidden">
                                <Image
                                    src={profileDraft.property_image_url}
                                    alt="Property visual"
                                    fill
                                    unoptimized
                                    sizes="(max-width: 1280px) 100vw, 540px"
                                    className="object-cover transition duration-300 group-hover:scale-[1.025]"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06101d]/[0.62] to-transparent px-4 py-3 text-[11px] font-semibold text-white">Click, browse or drag a new property image</div>
                            </div>
                        ) : (
                            <div className="flex h-56 flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,rgba(47,128,237,0.10),rgba(166,139,74,0.14))] text-center">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607993]">No property image yet</div>
                                <div className="text-[11px] text-[#7a90a8]">Click to browse or drag & drop an image here</div>
                            </div>
                        )}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0] ?? null)} />
                    <div className="flex flex-wrap gap-2">
                        {profileDraft.google_maps_url ? (
                            <a href={profileDraft.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex rounded-[12px] border border-[#2f80ed]/[0.22] bg-[#2f80ed]/[0.08] px-3 py-2 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14] hover:shadow-[0_10px_26px_rgba(47,128,237,0.10)] active:scale-[0.98]">
                                Open location in Google Maps
                            </a>
                        ) : null}
                        <button type="button" onClick={() => setShowMapLinkEditor((value) => !value)} className="rounded-[12px] border border-[#ccd9e8] bg-white/[0.64] px-3 py-2 text-[11px] font-semibold text-[#607993] transition hover:bg-white hover:text-[#0b1623] active:scale-[0.98]">
                            {profileDraft.google_maps_url ? "Edit location link" : "Add Google Maps link"}
                        </button>
                    </div>
                    {showMapLinkEditor ? (
                        <InputField label="Google Maps link" value={profileDraft.google_maps_url} onChange={(value) => setProfileDraft((draft) => ({ ...draft, google_maps_url: value }))} />
                    ) : null}
                </div>

                <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                            { label: "Price / sqm", value: sizeSqm > 0 ? formatEur(pricePerSqm) : "—", helper: sizeSqm > 0 ? `${sizeSqm} sqm` : "enter sqm" },
                            { label: "Monthly rent", value: formatEur(budgetSummary.monthlyRentEstimate), helper: "from Budget schedule" },
                            { label: "Credit / month", value: formatEur(budgetSummary.creditPaymentEur), helper: "from Budget credit" },
                            { label: "Insurance", value: `${formatEur(budgetSummary.lifeInsuranceEur)}/mo`, helper: `${formatEur(budgetSummary.propertyInsuranceEur)} property/year` },
                            { label: "Self participation", value: formatEur(selfParticipation), helper: "cash equity" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-[14px] border border-white/[0.74] bg-white/[0.54] px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.018] hover:bg-white/[0.78] hover:shadow-[0_14px_32px_rgba(41,73,112,0.10)]">
                                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">{item.label}</div>
                                <div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{item.value}</div>
                                <div className="mt-0.5 text-[10px] text-[#7a90a8]">{item.helper}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Address</span>
                            <div className="flex gap-2">
                                <select value={addressLanguage} onChange={(event) => setAddressLanguage(event.target.value as AddressLanguage)} className="h-9 rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-semibold text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50">
                                    <option value="en">English</option>
                                    <option value="local">Greek</option>
                                </select>
                                <input
                                    value={addressValue}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setProfileDraft((draft) => addressLanguage === "en" ? { ...draft, address_en: value } : { ...draft, address_local: value });
                                    }}
                                    className="h-9 min-w-0 flex-1 rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition hover:bg-white focus:border-[#2f80ed]/50 focus:bg-white"
                                />
                            </div>
                        </label>
                        <div>
                            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Acquisition date</span>
                            <AdminDatePicker value={profileDraft.acquisition_date} onChange={(value) => setProfileDraft((draft) => ({ ...draft, acquisition_date: value }))} />
                        </div>
                        <InputField label="Purchase price" value={profileDraft.purchase_price_eur} type="number" onChange={(value) => setProfileDraft((draft) => ({ ...draft, purchase_price_eur: toNumber(value) }))} />
                        <InputField label="Size sqm" value={profileDraft.size_sqm} type="number" onChange={(value) => setProfileDraft((draft) => ({ ...draft, size_sqm: toNumber(value) }))} />
                        <InputField label="KAEK" value={profileDraft.kaek} onChange={(value) => setProfileDraft((draft) => ({ ...draft, kaek: value }))} />
                        <InputField label="Owner AFM" value={profileDraft.owner_afm} onChange={(value) => setProfileDraft((draft) => ({ ...draft, owner_afm: value }))} />
                        <InputField label="ATAK" value={profileDraft.atak} onChange={(value) => setProfileDraft((draft) => ({ ...draft, atak: value }))} />
                        <InputField label="PEA number" value={profileDraft.pea_number} onChange={(value) => setProfileDraft((draft) => ({ ...draft, pea_number: value }))} />
                        <InputField label="Rental contract ref" value={profileDraft.rental_contract_reference} onChange={(value) => setProfileDraft((draft) => ({ ...draft, rental_contract_reference: value }))} />
                        <InputField label="Credit amount" value={profileDraft.credit_amount_eur} type="number" onChange={(value) => setProfileDraft((draft) => ({ ...draft, credit_amount_eur: toNumber(value) }))} />
                        <InputField label="Self participation" value={profileDraft.self_participation_eur} type="number" onChange={(value) => setProfileDraft((draft) => ({ ...draft, self_participation_eur: toNumber(value) }))} />
                        <InputField label="Taxisnet username" value={profileDraft.tax_portal_username} onChange={(value) => setProfileDraft((draft) => ({ ...draft, tax_portal_username: value }))} />
                        <div className="flex items-end gap-1.5">
                            <div className="flex-1">
                                <InputField label="Password vault ref" value={profileDraft.tax_portal_password_ref} type={showSecretRef ? "text" : "password"} onChange={(value) => setProfileDraft((draft) => ({ ...draft, tax_portal_password_ref: value }))} placeholder="Vault item / hint, not real password" />
                            </div>
                            <button type="button" onClick={() => setShowSecretRef((value) => !value)} className="h-9 rounded-[11px] border border-[#ccd9e8] bg-white/[0.70] px-2.5 text-[11px] font-semibold text-[#607993] transition hover:bg-white hover:text-[#0b1623] active:scale-[0.97]">
                                {showSecretRef ? "Hide" : "Show"}
                            </button>
                        </div>
                        <div className="sm:col-span-2">
                            <TextAreaField label="Notes" value={profileDraft.acquisition_notes} onChange={(value) => setProfileDraft((draft) => ({ ...draft, acquisition_notes: value }))} />
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );

    const renderCosts = () => (
        <SectionCard title="Acquisition costs" subtitle="Purchase price is controlled from Overview. Expense-linked rows can be included or excluded from the property acquisition total." action={<button type="button" onClick={() => void addCost()} disabled={saving} className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">+ Fee</button>}>
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[14px] border border-white/[0.74] bg-white/[0.54] px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.018] hover:bg-white/[0.78] hover:shadow-[0_14px_32px_rgba(41,73,112,0.10)]"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Purchase price</div><div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{formatEur(purchasePrice)}</div><div className="mt-0.5 text-[10px] text-[#7a90a8]">from Overview</div></div>
                <div className="rounded-[14px] border border-white/[0.74] bg-white/[0.54] px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.018] hover:bg-white/[0.78] hover:shadow-[0_14px_32px_rgba(41,73,112,0.10)]"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Included costs</div><div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{formatEur(transactionCosts)}</div><div className="mt-0.5 text-[10px] text-[#7a90a8]">excluded rows ignored</div></div>
                <div className="rounded-[14px] border border-white/[0.74] bg-white/[0.54] px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.018] hover:bg-white/[0.78] hover:shadow-[0_14px_32px_rgba(41,73,112,0.10)]"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Total acquisition</div><div className="mt-1 text-[18px] font-semibold text-[#0b1623]">{formatEur(totalAcquisition)}</div><div className="mt-0.5 text-[10px] text-[#7a90a8]">price + included costs</div></div>
            </div>

            {eligibleAcquisitionExpenses.length > 0 ? (
                <div className="mb-3 rounded-[16px] border border-[#a68b4a]/[0.20] bg-[#a68b4a]/[0.06] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a6228]">Available from Expenses</div>
                    <div className="grid gap-2 xl:grid-cols-2">
                        {eligibleAcquisitionExpenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between gap-2 rounded-[13px] border border-white/[0.72] bg-white/[0.50] px-3 py-2 transition hover:scale-[1.01] hover:bg-white/[0.74]">
                                <div>
                                    <div className="text-[11px] font-semibold text-[#0b1623]">{expense.title}</div>
                                    <div className="text-[9.5px] text-[#7a90a8]">{expense.category} · {expense.status} · {formatEur(expense.amount_eur)}</div>
                                </div>
                                <button type="button" onClick={() => void addCostFromExpense(expense)} disabled={saving} className="rounded-[9px] border border-[#2f80ed]/[0.22] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">Link</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                {nonPriceCosts.map((cost) => {
                    const draft = costDrafts[cost.id] ?? costToDraft(cost);
                    const linkedExpense = cost.expense_id ? expenseById.get(cost.expense_id) : null;
                    const calculatedAmount = calculatedCostAmount(draft);
                    return (
                        <div key={cost.id} ref={expandedCostIds.has(cost.id) ? newItemRef : null} draggable onDragStart={(event) => { setDraggedCostId(cost.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedCostId) void reorderCost(draggedCostId, cost.id); setDraggedCostId(null); }} onDragEnd={() => setDraggedCostId(null)} className="overflow-hidden rounded-[16px] border border-[#d8e8f6]/80 bg-white/[0.55] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.004] hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.72] hover:shadow-[0_16px_36px_rgba(41,73,112,0.10)]">
                            <button type="button" onClick={() => toggleCost(cost.id)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                                <div className="min-w-0">
                                    <div className="text-[12px] font-semibold text-[#0b1623]">{draft.label || cost.label}</div>
                                    <div className="mt-0.5 text-[10px] text-[#7a90a8]">{linkedExpense ? `Linked to Expenses · ${linkedExpense.category} · ${linkedExpense.status}` : "Local real estate row"} · {draft.include_in_total ? "included" : "excluded"} · {formatEur(calculatedAmount)}</div>
                                </div>
                                <span className={["flex h-8 w-8 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] transition", expandedCostIds.has(cost.id) ? "rotate-180" : ""].join(" ")}>⌄</span>
                            </button>
                            {expandedCostIds.has(cost.id) ? (
                            <div className="border-t border-white/[0.70] px-3 pb-3 pt-2">
                            <div className="mb-2 flex justify-end gap-1.5">
                                <button type="button" onClick={() => void saveCost(cost)} disabled={saving} className="rounded-[9px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">Save</button>
                                <button type="button" onClick={() => cancelCost(cost)} disabled={saving} className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.62] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#607993] transition hover:bg-white">Cancel</button>
                                <button type="button" onClick={() => void removeCost(cost)} disabled={saving} className="rounded-[9px] border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#8c5947] transition hover:bg-[#cfa090]/[0.14]">Delete</button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                <InputField label="Label" value={draft.label} onChange={(value) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, label: value } }))} />
                                <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Amount EUR</span><input type="number" value={calculatedAmount} onChange={(event) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, amount_eur: toNumber(event.target.value), rate_percent: 0 } }))} className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none transition focus:border-[#2f80ed]/50 focus:bg-white" /></label>
                                <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Category</span><select value={draft.category} onChange={(event) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, category: event.target.value as ManagedPropertyRealEstateCostCategory } }))} className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none">{costCategoryOrder.map((key) => <option key={key} value={key}>{costCategoryLabels[key]}</option>)}</select></label>
                                <InputField label="Rate %" value={draft.rate_percent} type="number" onChange={(value) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, rate_percent: toNumber(value) } }))} />
                                <InputField label="VAT %" value={draft.vat_rate_percent} type="number" onChange={(value) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, vat_rate_percent: toNumber(value) } }))} />
                                <label className="flex h-9 items-center gap-2 rounded-[11px] border border-[#ccd9e8] bg-white/[0.58] px-3 text-[11px] font-semibold text-[#0b1623]"><input type="checkbox" checked={draft.vat_included} onChange={(event) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, vat_included: event.target.checked } }))} /> VAT already included</label>
                                <label className="flex h-9 items-center gap-2 rounded-[11px] border border-[#ccd9e8] bg-white/[0.58] px-3 text-[11px] font-semibold text-[#0b1623]"><input type="checkbox" checked={draft.include_in_total} onChange={(event) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, include_in_total: event.target.checked } }))} /> Include in acquisition total</label>
                                <div className="sm:col-span-2 xl:col-span-4"><TextAreaField label="Note" value={draft.note} onChange={(value) => setCostDrafts((current) => ({ ...current, [cost.id]: { ...draft, note: value } }))} /></div>
                            </div>
                            </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );

    const renderServices = () => (
        <SectionCard title="Utilities and services" subtitle="Electricity, water, gas, internet and building fees. Cards are collapsed by default for faster scanning." action={<button type="button" onClick={() => void addService()} disabled={saving} className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">+ Service</button>}>
            <div className="space-y-2">
                {services.map((service) => {
                    const draft = serviceDrafts[service.id] ?? serviceToDraft(service);
                    const labels = serviceLabels[draft.service_type] ?? serviceLabels.other;
                    const expanded = expandedServiceIds.has(service.id);
                    const ready = Boolean(draft.provider_name || draft.account_number || draft.meter_number || draft.customer_code || draft.monthly_fee_eur);
                    return (
                        <div key={service.id} ref={expandedServiceIds.has(service.id) ? newItemRef : null} draggable onDragStart={(event) => { setDraggedServiceId(service.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedServiceId) void reorderService(draggedServiceId, service.id); setDraggedServiceId(null); }} onDragEnd={() => setDraggedServiceId(null)} className="overflow-hidden rounded-[16px] border border-[#d8e8f6]/80 bg-white/[0.55] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.004] hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.72] hover:shadow-[0_16px_36px_rgba(41,73,112,0.10)]">
                            <button type="button" onClick={() => toggleService(service.id)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[12px] font-semibold text-[#0b1623]">{labels.label} · {labels.local}</div>
                                        <span className={["rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]", ready ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]" : "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]"].join(" ")}>{ready ? "tracked" : "empty"}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-[#7a90a8]">{draft.provider_name || "No provider"} · {draft.account_number || draft.customer_code || "no account"} · {formatEur(draft.monthly_fee_eur)} / month</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-[#7a90a8]">{expanded ? "Collapse" : "Open"}</span>
                                    <span className={["flex h-8 w-8 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] transition", expanded ? "rotate-180" : ""].join(" ")}>⌄</span>
                                </div>
                            </button>

                            {expanded ? (
                                <div className="border-t border-white/[0.70] px-3 pb-3 pt-2">
                                    <div className="mb-2 flex justify-end gap-1.5">
                                        <button type="button" onClick={() => void saveService(service)} disabled={saving} className="rounded-[9px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">Save</button>
                                        <button type="button" onClick={() => cancelService(service)} disabled={saving} className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.62] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#607993] transition hover:bg-white">Cancel</button>
                                        <button type="button" onClick={() => void removeService(service)} disabled={saving} className="rounded-[9px] border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#8c5947] transition hover:bg-[#cfa090]/[0.14]">Delete</button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                        <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Type</span><select value={draft.service_type} onChange={(event) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, service_type: event.target.value as ManagedPropertyServiceType } }))} className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none">{Object.entries(serviceLabels).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
                                        <InputField label="Provider" value={draft.provider_name} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, provider_name: value } }))} />
                                        <div><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Start date</span><AdminDatePicker value={draft.start_date} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, start_date: value } }))} /></div>
                                        <InputField label="Account holder" value={draft.account_holder} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, account_holder: value } }))} />
                                        <InputField label="Account / supply no." value={draft.account_number} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, account_number: value } }))} />
                                        <InputField label="Meter no." value={draft.meter_number} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, meter_number: value } }))} />
                                        <InputField label="Contract no." value={draft.contract_number} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, contract_number: value } }))} />
                                        <InputField label="Customer code" value={draft.customer_code} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, customer_code: value } }))} />
                                        <InputField label="Payment code" value={draft.payment_code} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, payment_code: value } }))} />
                                        <InputField label="Delivery point / HKASP" value={draft.delivery_point} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, delivery_point: value } }))} />
                                        <InputField label="Plan" value={draft.plan_name} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, plan_name: value } }))} />
                                        <InputField label="Monthly fee EUR" value={draft.monthly_fee_eur} type="number" onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, monthly_fee_eur: toNumber(value) } }))} />
                                        <InputField label="Phone" value={draft.phone} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, phone: value } }))} />
                                        <InputField label="Website" value={draft.website} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, website: value } }))} />
                                        {draft.service_type === "building_fees" ? <><InputField label="Manager" value={draft.manager_name} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, manager_name: value } }))} /><InputField label="Manager phone" value={draft.manager_phone} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, manager_phone: value } }))} /><InputField label="Manager email" value={draft.manager_email} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, manager_email: value } }))} /><InputField label="Bank account" value={draft.manager_bank_account} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, manager_bank_account: value } }))} /></> : null}
                                        <div className="sm:col-span-2 xl:col-span-4"><TextAreaField label="Note" value={draft.note} onChange={(value) => setServiceDrafts((current) => ({ ...current, [service.id]: { ...draft, note: value } }))} /></div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );

    const renderPeople = () => (
        <SectionCard title="People" subtitle="Tenants, previous owners, property managers and operational contacts." action={<div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => void addContact("tenant")} disabled={saving} className="rounded-[10px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.14]">+ Tenant</button><button type="button" onClick={() => void addContact("property_manager")} disabled={saving} className="rounded-[10px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">+ Manager</button><button type="button" onClick={() => void addContact("previous_owner")} disabled={saving} className="rounded-[10px] border border-[#a68b4a]/[0.24] bg-[#a68b4a]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#7a6228] transition hover:bg-[#a68b4a]/[0.14]">+ Owner</button></div>}>
            <div className="space-y-2">
                {contacts.map((contact) => {
                    const draft = contactDrafts[contact.id] ?? contactToDraft(contact);
                    const expanded = expandedContactIds.has(contact.id);
                    return (
                        <div key={contact.id} ref={expandedContactIds.has(contact.id) ? newItemRef : null} draggable onDragStart={(event) => { setDraggedContactId(contact.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedContactId) void reorderContact(draggedContactId, contact.id); setDraggedContactId(null); }} onDragEnd={() => setDraggedContactId(null)} className="overflow-hidden rounded-[16px] border border-[#d8e8f6]/80 bg-white/[0.55] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.004] hover:border-[#2f80ed]/[0.18] hover:bg-white/[0.72] hover:shadow-[0_16px_36px_rgba(41,73,112,0.10)]">
                            <button type="button" onClick={() => toggleContact(contact.id)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[12px] font-semibold text-[#0b1623]">{draft.full_name || "Unnamed contact"}</div>
                                        <span className="rounded-full border border-[#2f80ed]/[0.20] bg-[#2f80ed]/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#1560bc]">{contactLabels[draft.contact_type]}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-[#7a90a8]">{draft.afm || "no AFM"} · {draft.phone || "no phone"} · {draft.email || "no email"} · {draft.iban || "no IBAN"}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-[#7a90a8]">{expanded ? "Collapse" : "Open"}</span>
                                    <span className={["flex h-8 w-8 items-center justify-center rounded-full border border-[#ccd9e8] bg-white/[0.72] text-[#607993] transition", expanded ? "rotate-180" : ""].join(" ")}>⌄</span>
                                </div>
                            </button>
                            {expanded ? (
                                <div className="border-t border-white/[0.70] px-3 pb-3 pt-2">
                                    <div className="mb-2 flex justify-end gap-1.5"><button type="button" onClick={() => void saveContact(contact)} disabled={saving} className="rounded-[9px] border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.14]">Save</button><button type="button" onClick={() => cancelContact(contact)} disabled={saving} className="rounded-[9px] border border-[#ccd9e8] bg-white/[0.62] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#607993] transition hover:bg-white">Cancel</button><button type="button" onClick={() => void removeContact(contact)} disabled={saving} className="rounded-[9px] border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#8c5947] transition hover:bg-[#cfa090]/[0.14]">Delete</button></div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <label className="block"><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">Type</span><select value={draft.contact_type} onChange={(event) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, contact_type: event.target.value as ManagedPropertyRealEstateContactType } }))} className="h-9 w-full rounded-[11px] border border-[#ccd9e8] bg-white/[0.72] px-3 text-[12px] font-medium text-[#0b1623] outline-none">{Object.entries(contactLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                                        <InputField label="Name" value={draft.full_name} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, full_name: value } }))} />
                                        <InputField label="AFM" value={draft.afm} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, afm: value } }))} />
                                        <InputField label="Phone" value={draft.phone} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, phone: value } }))} />
                                        <InputField label="Email" value={draft.email} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, email: value } }))} />
                                        <InputField label="IBAN" value={draft.iban} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, iban: value } }))} />
                                        <div className="sm:col-span-2"><TextAreaField label="Note" value={draft.note} onChange={(value) => setContactDrafts((current) => ({ ...current, [contact.id]: { ...draft, note: value } }))} /></div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );

    const renderActiveSection = () => {
        if (activeSection === "services") return renderServices();
        if (activeSection === "costs") return renderCosts();
        if (activeSection === "people") return renderPeople();
        return renderOverview();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <button type="button" aria-label="Close real estate modal" className="fixed inset-0 cursor-default bg-[#06101d]/[0.52] backdrop-blur-[10px]" onClick={onClose} />
            <div className="relative mx-auto flex h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-white/[0.72] bg-white/[0.74] shadow-[0_30px_120px_rgba(6,16,29,0.38),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(15,42,71,0.11),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(166,139,74,0.15),transparent_24%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.62] to-transparent" />
                <div className="relative shrink-0 border-b border-white/[0.72] px-5 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#0f2a47]/[0.18] bg-[#0f2a47]/[0.07] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#0f2a47]"><IconBuilding /> Real Estate Cockpit · DB live</div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">{projectLabel} Real Estate</h2>
                            {error ? <p className="mt-1 text-[12px] font-semibold text-[#9d2f2f]">{error}</p> : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Unit19ModalSwitcher activePanel="realEstate" onSwitchPanel={onSwitchPanel} incomeLabel="Budget" showRealEstate />
                            <button type="button" onClick={() => void loadData()} disabled={loading || saving} className="rounded-[14px] border border-white/[0.78] bg-white/[0.56] px-4 py-2.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.85] disabled:cursor-not-allowed disabled:opacity-50">Reload</button>
                            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.76] bg-white/[0.54] text-[#7a90a8] transition hover:bg-white/[0.88] hover:text-[#0b1623] active:scale-[0.96]" aria-label="Close">×</button>
                        </div>
                    </div>
                </div>
                <div className="relative grid shrink-0 grid-cols-2 gap-2 border-b border-white/[0.62] px-5 py-3 sm:grid-cols-5 sm:px-6">
                    {[
                        { label: "Asset", value: formatEur(purchasePrice), helper: sizeSqm > 0 ? `${sizeSqm} sqm · ${formatEur(pricePerSqm)}/sqm` : "purchase price" },
                        { label: "Acquisition cost", value: formatEur(totalAcquisition), helper: "price + transaction costs" },
                        { label: "Transaction costs", value: formatEur(transactionCosts), helper: "linked with Expenses where possible" },
                        { label: "Finance", value: formatEur(creditAmount), helper: `monthly ${formatEur(budgetSummary.creditPaymentEur)}` },
                        { label: "Services", value: `${servicesReady}/${Math.max(services.length, 1)}`, helper: `${formatEur(serviceMonthly)} monthly tracked` },
                    ].map((card) => (<div key={card.label} className="rounded-[16px] border border-white/[0.80] bg-white/[0.62] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.015] hover:border-[#2f80ed]/[0.24] hover:bg-white/[0.82] hover:shadow-[0_18px_44px_rgba(41,73,112,0.13)]"><div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">{card.label}</div><div className="mt-1 text-[20px] font-semibold leading-none text-[#0b1623]">{card.value}</div><div className="mt-1 text-[10px] text-[#7a90a8]">{card.helper}</div></div>))}
                </div>
                <div className="relative min-h-0 flex-1 px-5 py-4 sm:px-6">
                    {loading ? <div className="rounded-[20px] border border-white/[0.76] bg-white/[0.58] p-6 text-[13px] font-semibold text-[#607993]">Loading real estate data...</div> : (
                        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <aside className="rounded-[22px] border border-white/[0.76] bg-white/[0.50] p-3 shadow-[0_16px_46px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl">
                                <div className="mb-3 px-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#7a90a8]">Property sections</div>
                                <div className="space-y-2">
                                    {sections.map((section) => {
                                        const active = activeSection === section.key;
                                        return (
                                            <button key={section.key} type="button" onClick={() => setActiveSection(section.key)} className={["w-full rounded-[16px] border px-3 py-3 text-left transition active:scale-[0.99]", active ? "border-[#2f80ed]/[0.36] bg-[#2f80ed]/[0.12] shadow-[0_12px_26px_rgba(47,128,237,0.10)]" : "border-white/[0.68] bg-white/[0.48] hover:scale-[1.012] hover:border-[#2f80ed]/[0.22] hover:bg-white/[0.78] hover:shadow-[0_12px_26px_rgba(47,128,237,0.08)]"].join(" ")}>
                                                <div className={["text-[12px] font-semibold", active ? "text-[#1560bc]" : "text-[#0b1623]"].join(" ")}>{section.label}</div>
                                                <div className="mt-1 text-[10px] leading-snug text-[#7a90a8]">{section.helper}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>
                            <main className="min-h-0 overflow-y-auto pr-1">{renderActiveSection()}</main>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
