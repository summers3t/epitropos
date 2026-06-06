"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Unit19ModalSwitcher, {
  type Unit19PanelKey,
} from "@/components/admin/Unit19ModalSwitcher";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
  createManagedPropertyIncomeOwnerExpense,
  deleteManagedPropertyIncomeOwnerExpense,
  getManagedPropertyBySlug,
  getManagedPropertyIncome,
  updateManagedPropertyIncomeMonth,
  updateManagedPropertyIncomeMonths,
  updateManagedPropertyTaxReserve,
  type ManagedProperty,
  type ManagedPropertyIncomeMonth,
  type ManagedPropertyIncomeMonthPatch,
  type ManagedPropertyIncomeOwnerExpense,
  type ManagedPropertyTaxReserve,
} from "@/lib/admin/managedPropertiesApi";

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchPanel?: (panel: Unit19PanelKey) => void;
  propertySlug?: string;
  projectLabel?: string;
};

type ExpenseDraft = {
  monthId: string;
  title: string;
  amountEur: number;
};

type UtilityKey =
  | "electricity_confirmed"
  | "water_confirmed"
  | "gas_confirmed"
  | "building_fees_confirmed";
type NorthStarBudgetKind = "income" | "expense";

type Unit19BudgetKey =
  | "electricity"
  | "water"
  | "gas"
  | "building_fees"
  | "property_insurance"
  | "life_insurance";

type Unit19BudgetEntry = {
  key: Unit19BudgetKey;
  label: string;
  defaultCheckedFrom?: UtilityKey;
};

type Unit19BudgetState = {
  marker: "unit19_budget_v1";
  credit_expected_eur?: number;
  credit_paid?: boolean;
  credit_paid_date?: string | null;
  entries?: Partial<
    Record<Unit19BudgetKey, { checked?: boolean; amount_eur?: number }>
  >;
};

type Unit19CreditConfig = {
  marker: "unit19_credit_v1";
  payment_eur: number;
  start_month: number;
  end_month: number;
  life_insurance_eur: number;
  property_insurance_eur: number;
  property_insurance_month: number;
};
type NorthStarBudgetKey =
  | "electricity"
  | "water"
  | "gas"
  | "building_fees"
  | "health_insurance"
  | "monthly_living_costs"
  | "duo"
  | "healthcare_allowance"
  | "salary"
  | "savings"
  | "family_support";

type NorthStarBudgetEntry = {
  key: NorthStarBudgetKey;
  label: string;
  kind: NorthStarBudgetKind;
};

type NorthStarBudgetState = {
  marker: "northstar_budget_v1";
  tuition_paid?: boolean;
  tuition_expected_eur?: number;
  entries?: Partial<
    Record<NorthStarBudgetKey, { checked?: boolean; amount_eur?: number }>
  >;
};

type NorthStarTuitionConfig = {
  marker: "northstar_tuition_v1";
  amount_eur: number;
  start_month: number;
  end_month: number;
  payment_mode: "monthly" | "once";
};

const PROPERTY_SLUG = "unit-19";
const DEFAULT_YEAR = 2026;
const MIN_YEAR = 2025;
const utilityOrder: UtilityKey[] = [
  "electricity_confirmed",
  "water_confirmed",
  "gas_confirmed",
  "building_fees_confirmed",
];

const utilityLabels: Record<UtilityKey, string> = {
  electricity_confirmed: "Electricity",
  water_confirmed: "Water",
  gas_confirmed: "Gas",
  building_fees_confirmed: "Building fees",
};


const unit19BudgetEntries: Unit19BudgetEntry[] = [
  { key: "electricity", label: "Electricity", defaultCheckedFrom: "electricity_confirmed" },
  { key: "water", label: "Water", defaultCheckedFrom: "water_confirmed" },
  { key: "gas", label: "Gas", defaultCheckedFrom: "gas_confirmed" },
  { key: "building_fees", label: "Building fees", defaultCheckedFrom: "building_fees_confirmed" },
  { key: "property_insurance", label: "Property insurance" },
  { key: "life_insurance", label: "Life insurance" },
];

const northStarBudgetEntries: NorthStarBudgetEntry[] = [
  { key: "electricity", label: "Electricity", kind: "expense" },
  { key: "water", label: "Water", kind: "expense" },
  { key: "gas", label: "Gas", kind: "expense" },
  { key: "building_fees", label: "Building fees", kind: "expense" },
  { key: "health_insurance", label: "Health insurance", kind: "expense" },
  {
    key: "monthly_living_costs",
    label: "Monthly living costs",
    kind: "expense",
  },
  { key: "duo", label: "DUO income", kind: "income" },
  {
    key: "healthcare_allowance",
    label: "Healthcare allowance",
    kind: "income",
  },
  { key: "salary", label: "Salary", kind: "income" },
  { key: "savings", label: "Savings", kind: "income" },
  { key: "family_support", label: "Family support", kind: "income" },
];

const northStarIncomeEntries = northStarBudgetEntries.filter(
  (entry) => entry.kind === "income",
);
const northStarExpenseEntries = northStarBudgetEntries.filter(
  (entry) => entry.kind === "expense",
);

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

const inputClass =
  "w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]";

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


function defaultUnit19BudgetState(): Unit19BudgetState {
  return { marker: "unit19_budget_v1", credit_paid: false, entries: {} };
}

function parseUnit19BudgetState(
  note: string | null | undefined,
): Unit19BudgetState {
  if (!note) return defaultUnit19BudgetState();

  try {
    const parsed = JSON.parse(note) as Partial<Unit19BudgetState>;
    if (parsed?.marker === "unit19_budget_v1") {
      return {
        marker: "unit19_budget_v1",
        credit_expected_eur: Number(parsed.credit_expected_eur ?? 0),
        credit_paid: Boolean(parsed.credit_paid),
        credit_paid_date: parsed.credit_paid_date ?? null,
        entries: parsed.entries ?? {},
      };
    }
  } catch {
    return defaultUnit19BudgetState();
  }

  return defaultUnit19BudgetState();
}

function serializeUnit19BudgetState(state: Unit19BudgetState) {
  return JSON.stringify({
    marker: "unit19_budget_v1",
    credit_expected_eur: Number(state.credit_expected_eur ?? 0),
    credit_paid: Boolean(state.credit_paid),
    credit_paid_date: state.credit_paid_date ?? null,
    entries: state.entries ?? {},
  });
}

function defaultUnit19CreditConfig(): Unit19CreditConfig {
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

function parseUnit19CreditConfig(
  note: string | null | undefined,
): Unit19CreditConfig {
  if (!note) return defaultUnit19CreditConfig();

  try {
    const parsed = JSON.parse(note) as Partial<Unit19CreditConfig>;
    if (parsed?.marker === "unit19_credit_v1") {
      return {
        marker: "unit19_credit_v1",
        payment_eur: Number(parsed.payment_eur ?? 0),
        start_month: clampMonth(Number(parsed.start_month ?? 1)),
        end_month: clampMonth(Number(parsed.end_month ?? 12)),
        life_insurance_eur: Number(parsed.life_insurance_eur ?? 0),
        property_insurance_eur: Number(parsed.property_insurance_eur ?? 0),
        property_insurance_month: clampMonth(Number(parsed.property_insurance_month ?? 1)),
      };
    }
  } catch {
    return defaultUnit19CreditConfig();
  }

  return defaultUnit19CreditConfig();
}

function serializeUnit19CreditConfig(config: Unit19CreditConfig) {
  return JSON.stringify({
    marker: "unit19_credit_v1",
    payment_eur: Number(config.payment_eur || 0),
    start_month: clampMonth(config.start_month),
    end_month: clampMonth(config.end_month),
    life_insurance_eur: Number(config.life_insurance_eur || 0),
    property_insurance_eur: Number(config.property_insurance_eur || 0),
    property_insurance_month: clampMonth(config.property_insurance_month),
  });
}

function getCreditExpectedForMonth(month: number, config: Unit19CreditConfig) {
  if (config.payment_eur <= 0) return 0;
  return isMonthInRange(month, config.start_month, config.end_month)
    ? config.payment_eur
    : 0;
}

function getCreditExpectedForState(
  month: number,
  config: Unit19CreditConfig,
  state: Unit19BudgetState,
) {
  if (Number(state.credit_expected_eur ?? 0) > 0)
    return Number(state.credit_expected_eur ?? 0);
  return getCreditExpectedForMonth(month, config);
}

function getUnit19BudgetAmount(state: Unit19BudgetState, key: Unit19BudgetKey) {
  return Number(state.entries?.[key]?.amount_eur ?? 0);
}

function getUnit19BudgetChecked(
  state: Unit19BudgetState,
  key: Unit19BudgetKey,
) {
  return Boolean(state.entries?.[key]?.checked);
}

function getUnit19BudgetTotals(state: Unit19BudgetState) {
  const checkedEntries = unit19BudgetEntries.filter((entry) =>
    getUnit19BudgetChecked(state, entry.key),
  );
  const expenses = checkedEntries.reduce(
    (sum, entry) => sum + getUnit19BudgetAmount(state, entry.key),
    0,
  );

  return { expenses, checkedCount: checkedEntries.length };
}

function defaultNorthStarBudgetState(): NorthStarBudgetState {
  return { marker: "northstar_budget_v1", tuition_paid: false, entries: {} };
}

function parseNorthStarBudgetState(
  note: string | null | undefined,
): NorthStarBudgetState {
  if (!note) return defaultNorthStarBudgetState();

  try {
    const parsed = JSON.parse(note) as Partial<NorthStarBudgetState>;
    if (parsed?.marker === "northstar_budget_v1") {
      return {
        marker: "northstar_budget_v1",
        tuition_paid: Boolean(parsed.tuition_paid),
        tuition_expected_eur: Number(parsed.tuition_expected_eur ?? 0),
        entries: parsed.entries ?? {},
      };
    }
  } catch {
    return defaultNorthStarBudgetState();
  }

  return defaultNorthStarBudgetState();
}

function serializeNorthStarBudgetState(state: NorthStarBudgetState) {
  return JSON.stringify({
    marker: "northstar_budget_v1",
    tuition_paid: Boolean(state.tuition_paid),
    tuition_expected_eur: Number(state.tuition_expected_eur ?? 0),
    entries: state.entries ?? {},
  });
}

function defaultNorthStarTuitionConfig(): NorthStarTuitionConfig {
  return {
    marker: "northstar_tuition_v1",
    amount_eur: 0,
    start_month: 9,
    end_month: 6,
    payment_mode: "monthly",
  };
}

function parseNorthStarTuitionConfig(
  note: string | null | undefined,
): NorthStarTuitionConfig {
  if (!note) return defaultNorthStarTuitionConfig();

  try {
    const parsed = JSON.parse(note) as Partial<NorthStarTuitionConfig>;
    if (parsed?.marker === "northstar_tuition_v1") {
      return {
        marker: "northstar_tuition_v1",
        amount_eur: Number(parsed.amount_eur ?? 0),
        start_month: clampMonth(Number(parsed.start_month ?? 9)),
        end_month: clampMonth(Number(parsed.end_month ?? 6)),
        payment_mode: parsed.payment_mode === "once" ? "once" : "monthly",
      };
    }
  } catch {
    return defaultNorthStarTuitionConfig();
  }

  return defaultNorthStarTuitionConfig();
}

function serializeNorthStarTuitionConfig(config: NorthStarTuitionConfig) {
  return JSON.stringify({
    marker: "northstar_tuition_v1",
    amount_eur: Number(config.amount_eur || 0),
    start_month: clampMonth(config.start_month),
    end_month: clampMonth(config.end_month),
    payment_mode: config.payment_mode,
  });
}

function clampMonth(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), 12);
}

function isMonthInRange(month: number, startMonth: number, endMonth: number) {
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth;
  return month >= startMonth || month <= endMonth;
}

function getTuitionExpectedForMonth(
  month: number,
  config: NorthStarTuitionConfig,
) {
  if (config.amount_eur <= 0) return 0;
  if (config.payment_mode === "once")
    return month === config.start_month ? config.amount_eur : 0;
  return isMonthInRange(month, config.start_month, config.end_month)
    ? config.amount_eur
    : 0;
}

function getTuitionExpectedForState(
  month: number,
  config: NorthStarTuitionConfig,
  state: NorthStarBudgetState,
) {
  if (Number(state.tuition_expected_eur ?? 0) > 0)
    return Number(state.tuition_expected_eur ?? 0);
  return getTuitionExpectedForMonth(month, config);
}

function getBudgetAmount(state: NorthStarBudgetState, key: NorthStarBudgetKey) {
  return Number(state.entries?.[key]?.amount_eur ?? 0);
}

function getBudgetChecked(
  state: NorthStarBudgetState,
  key: NorthStarBudgetKey,
) {
  return Boolean(state.entries?.[key]?.checked);
}

function getBudgetTotals(state: NorthStarBudgetState) {
  const income = northStarIncomeEntries.reduce(
    (sum, entry) =>
      getBudgetChecked(state, entry.key)
        ? sum + getBudgetAmount(state, entry.key)
        : sum,
    0,
  );
  const expenses = northStarExpenseEntries.reduce(
    (sum, entry) =>
      getBudgetChecked(state, entry.key)
        ? sum + getBudgetAmount(state, entry.key)
        : sum,
    0,
  );
  const incomeChecked = northStarIncomeEntries.filter((entry) =>
    getBudgetChecked(state, entry.key),
  ).length;
  const expenseChecked = northStarExpenseEntries.filter((entry) =>
    getBudgetChecked(state, entry.key),
  ).length;

  return { income, expenses, incomeChecked, expenseChecked };
}

function IconClose() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconIncome() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-7" />
      <path d="M6 9l6-5 6 5" />
    </svg>
  );
}

export default function Unit19IncomeModal({
  open,
  onClose,
  onSwitchPanel,
  propertySlug = PROPERTY_SLUG,
  projectLabel = "Unit 19",
}: Props) {
  const [managedProperty, setManagedProperty] =
    useState<ManagedProperty | null>(null);
  const [managedPropertyId, setManagedPropertyId] = useState<string | null>(
    null,
  );
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [months, setMonths] = useState<ManagedPropertyIncomeMonth[]>([]);
  const [ownerExpenses, setOwnerExpenses] = useState<
    ManagedPropertyIncomeOwnerExpense[]
  >([]);
  const [taxReserve, setTaxReserve] =
    useState<ManagedPropertyTaxReserve | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [monthlyRentEur, setMonthlyRentEur] = useState(450);
  const [rentStartMonth, setRentStartMonth] = useState(5);
  const [rentEndMonth, setRentEndMonth] = useState(9);
  const [setupMode, setSetupMode] = useState<"rent" | "credit">("rent");
  const [detailsMode, setDetailsMode] = useState<"rent" | "credit">("rent");
  const [creditPaymentEur, setCreditPaymentEur] = useState(0);
  const [creditStartMonth, setCreditStartMonth] = useState(1);
  const [creditEndMonth, setCreditEndMonth] = useState(12);
  const [lifeInsuranceEur, setLifeInsuranceEur] = useState(0);
  const [propertyInsuranceEur, setPropertyInsuranceEur] = useState(0);
  const [propertyInsuranceMonth, setPropertyInsuranceMonth] = useState(1);
  const [tuitionAmountEur, setTuitionAmountEur] = useState(0);
  const [tuitionStartMonth, setTuitionStartMonth] = useState(9);
  const [tuitionEndMonth, setTuitionEndMonth] = useState(6);
  const [tuitionPaymentMode, setTuitionPaymentMode] = useState<
    "monthly" | "once"
  >("monthly");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNorthStarWorkspace =
    propertySlug === "maria-northstar" ||
    managedProperty?.property_type === "personal_roadmap" ||
    managedProperty?.property_type === "student_roadmap";

  const tuitionConfig = useMemo<NorthStarTuitionConfig>(
    () => ({
      marker: "northstar_tuition_v1",
      amount_eur: Number(tuitionAmountEur || 0),
      start_month: tuitionStartMonth,
      end_month: tuitionEndMonth,
      payment_mode: tuitionPaymentMode,
    }),
    [tuitionAmountEur, tuitionStartMonth, tuitionEndMonth, tuitionPaymentMode],
  );


  const unit19CreditConfig = useMemo<Unit19CreditConfig>(
    () => ({
      marker: "unit19_credit_v1",
      payment_eur: Number(creditPaymentEur || 0),
      start_month: creditStartMonth,
      end_month: creditEndMonth,
      life_insurance_eur: Number(lifeInsuranceEur || 0),
      property_insurance_eur: Number(propertyInsuranceEur || 0),
      property_insurance_month: propertyInsuranceMonth,
    }),
    [
      creditPaymentEur,
      creditStartMonth,
      creditEndMonth,
      lifeInsuranceEur,
      propertyInsuranceEur,
      propertyInsuranceMonth,
    ],
  );

  async function loadIncome(targetYear = year) {
    try {
      setLoading(true);
      setError(null);

      const property = await getManagedPropertyBySlug(propertySlug);
      const result = await getManagedPropertyIncome(property.id, targetYear);

      setManagedProperty(property);
      setManagedPropertyId(property.id);
      setMonths(result.months);
      setOwnerExpenses(result.ownerExpenses);
      setTaxReserve(result.taxReserve);

      const activeMonths = result.months.filter(
        (month) => month.rent_expected_eur > 0,
      );
      if (activeMonths.length > 0) {
        setMonthlyRentEur(activeMonths[0].rent_expected_eur);
        setRentStartMonth(
          Math.min(...activeMonths.map((month) => month.month)),
        );
        setRentEndMonth(Math.max(...activeMonths.map((month) => month.month)));
      } else if (property.slug === "maria-northstar") {
        setMonthlyRentEur(270);
        setRentStartMonth(1);
        setRentEndMonth(12);
      }

      const tuition = parseNorthStarTuitionConfig(result.taxReserve?.note);
      setTuitionAmountEur(tuition.amount_eur);
      setTuitionStartMonth(tuition.start_month);
      setTuitionEndMonth(tuition.end_month);
      setTuitionPaymentMode(tuition.payment_mode);

      const credit = parseUnit19CreditConfig(result.taxReserve?.note);
      setCreditPaymentEur(credit.payment_eur);
      setCreditStartMonth(credit.start_month);
      setCreditEndMonth(credit.end_month);
      setLifeInsuranceEur(credit.life_insurance_eur);
      setPropertyInsuranceEur(credit.property_insurance_eur);
      setPropertyInsuranceMonth(credit.property_insurance_month);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load income data",
      );
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
  }, [open, onClose, propertySlug, year]);

  const selected =
    months.find((month) => month.month === selectedMonth) ?? months[0];

  const expensesByMonthId = useMemo(() => {
    const map = new Map<string, ManagedPropertyIncomeOwnerExpense[]>();
    for (const expense of ownerExpenses) {
      if (!expense.income_month_id) continue;
      map.set(expense.income_month_id, [
        ...(map.get(expense.income_month_id) ?? []),
        expense,
      ]);
    }
    return map;
  }, [ownerExpenses]);

  const northStarMonthState = useMemo(() => {
    const map = new Map<string, NorthStarBudgetState>();
    for (const month of months)
      map.set(month.id, parseNorthStarBudgetState(month.note));
    return map;
  }, [months]);

  const unit19MonthState = useMemo(() => {
    const map = new Map<string, Unit19BudgetState>();
    for (const month of months)
      map.set(month.id, parseUnit19BudgetState(month.note));
    return map;
  }, [months]);

  const stats = useMemo(() => {
    const expectedRent = months.reduce(
      (sum, month) => sum + month.rent_expected_eur,
      0,
    );
    const collectedRent = months.reduce(
      (sum, month) => sum + month.rent_paid_eur,
      0,
    );
    const ownerCostTotal = ownerExpenses.reduce(
      (sum, expense) => sum + expense.amount_eur,
      0,
    );
    const unpaidMonths = months.filter(
      (month) => month.rent_expected_eur > 0 && month.rent_status !== "paid",
    ).length;
    const taxRate = taxReserve?.tax_rate_percent ?? 15;
    const estimatedTax = Math.round((collectedRent * taxRate) / 100);

    const tuitionExpected = months.reduce((sum, month) => {
      const state =
        northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
      return (
        sum + getTuitionExpectedForState(month.month, tuitionConfig, state)
      );
    }, 0);
    const tuitionPaid = months.reduce((sum, month) => {
      const state =
        northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
      return state.tuition_paid
        ? sum + getTuitionExpectedForState(month.month, tuitionConfig, state)
        : sum;
    }, 0);
    const northStarIncome = months.reduce((sum, month) => {
      const state =
        northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
      return sum + getBudgetTotals(state).income;
    }, 0);
    const northStarExpenses = months.reduce((sum, month) => {
      const state =
        northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
      return sum + getBudgetTotals(state).expenses;
    }, 0);

    const creditExpected = months.reduce((sum, month) => {
      const state =
        unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
      return (
        sum + getCreditExpectedForState(month.month, unit19CreditConfig, state)
      );
    }, 0);
    const creditPaid = months.reduce((sum, month) => {
      const state =
        unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
      return state.credit_paid
        ? sum + getCreditExpectedForState(month.month, unit19CreditConfig, state)
        : sum;
    }, 0);
    const unit19TrackedExpenses = months.reduce((sum, month) => {
      const state =
        unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
      return sum + getUnit19BudgetTotals(state).expenses;
    }, 0);

    return {
      expectedRent,
      collectedRent,
      outstanding: Math.max(expectedRent - collectedRent, 0),
      ownerExpenses: ownerCostTotal,
      estimatedTax,
      netAfterOwnerCosts:
        collectedRent - creditExpected - unit19TrackedExpenses - ownerCostTotal - estimatedTax,
      unpaidMonths,
      tuitionExpected,
      tuitionPaid,
      northStarIncome,
      northStarExpenses,
      northStarNetEstimate:
        northStarIncome - expectedRent - tuitionExpected - northStarExpenses,
      creditExpected,
      creditPaid,
      unit19TrackedExpenses,
    };
  }, [
    months,
    northStarMonthState,
    ownerExpenses,
    taxReserve,
    tuitionConfig,
    unit19CreditConfig,
    unit19MonthState,
  ]);

  async function patchMonth(
    month: ManagedPropertyIncomeMonth,
    patch: ManagedPropertyIncomeMonthPatch,
  ) {
    try {
      setSaving(true);
      setError(null);

      const updated = await updateManagedPropertyIncomeMonth(month.id, patch);
      setMonths((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save month");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUtility(
    month: ManagedPropertyIncomeMonth,
    key: UtilityKey,
  ) {
    await patchMonth(month, {
      [key]: !month[key],
    } as ManagedPropertyIncomeMonthPatch);
  }

  async function patchNorthStarBudget(
    month: ManagedPropertyIncomeMonth,
    nextState: NorthStarBudgetState,
  ) {
    await patchMonth(month, { note: serializeNorthStarBudgetState(nextState) });
  }


  async function patchUnit19Budget(
    month: ManagedPropertyIncomeMonth,
    nextState: Unit19BudgetState,
  ) {
    await patchMonth(month, { note: serializeUnit19BudgetState(nextState) });
  }

  async function applyRentSchedule() {
    try {
      setSaving(true);
      setError(null);

      const patches = months
        .filter((month) =>
          isMonthInRange(month.month, rentStartMonth, rentEndMonth),
        )
        .map((month) => {
          const expected = Number(monthlyRentEur || 0);
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

      if (patches.length === 0) return;

      const updated = await updateManagedPropertyIncomeMonths(patches);
      setMonths((current) =>
        current.map(
          (month) => updated.find((item) => item.id === month.id) ?? month,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply rent schedule",
      );
    } finally {
      setSaving(false);
    }
  }

  async function applyTuitionSetup() {
    if (!taxReserve) return;

    try {
      setSaving(true);
      setError(null);

      const updatedReserve = await updateManagedPropertyTaxReserve(
        taxReserve.id,
        {
          estimated_tax_eur: Number(tuitionAmountEur || 0),
          note: serializeNorthStarTuitionConfig(tuitionConfig),
        },
      );
      setTaxReserve(updatedReserve);

      const patches = months
        .filter((month) =>
          tuitionPaymentMode === "once"
            ? month.month === tuitionStartMonth
            : isMonthInRange(month.month, tuitionStartMonth, tuitionEndMonth),
        )
        .map((month) => {
          const currentState =
            northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
          const expected = Number(tuitionAmountEur || 0);
          return {
            id: month.id,
            patch: {
              note: serializeNorthStarBudgetState({
                ...currentState,
                tuition_expected_eur: expected,
                tuition_paid: expected > 0 ? currentState.tuition_paid : false,
              }),
            },
          };
        });

      if (patches.length > 0) {
        const updatedMonths = await updateManagedPropertyIncomeMonths(patches);
        setMonths((current) =>
          current.map(
            (month) =>
              updatedMonths.find((item) => item.id === month.id) ?? month,
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save tuition setup",
      );
    } finally {
      setSaving(false);
    }
  }

  async function applyCreditSetup() {
    if (!taxReserve) return;

    try {
      setSaving(true);
      setError(null);

      const updatedReserve = await updateManagedPropertyTaxReserve(
        taxReserve.id,
        { note: serializeUnit19CreditConfig(unit19CreditConfig) },
      );
      setTaxReserve(updatedReserve);

      const patches = months
        .filter(
          (month) =>
            isMonthInRange(month.month, creditStartMonth, creditEndMonth) ||
            month.month === propertyInsuranceMonth,
        )
        .map((month) => {
          const currentState =
            unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
          const expectedCredit = Number(creditPaymentEur || 0);
          const nextEntries = { ...(currentState.entries ?? {}) };

          if (lifeInsuranceEur > 0) {
            nextEntries.life_insurance = {
              ...(nextEntries.life_insurance ?? {}),
              checked: true,
              amount_eur: Number(lifeInsuranceEur || 0),
            };
          }

          if (
            propertyInsuranceEur > 0 &&
            month.month === propertyInsuranceMonth
          ) {
            nextEntries.property_insurance = {
              ...(nextEntries.property_insurance ?? {}),
              checked: true,
              amount_eur: Number(propertyInsuranceEur || 0),
            };
          }

          return {
            id: month.id,
            patch: {
              note: serializeUnit19BudgetState({
                ...currentState,
                credit_expected_eur: expectedCredit,
                credit_paid:
                  expectedCredit > 0 ? currentState.credit_paid : false,
                entries: nextEntries,
              }),
            },
          };
        });

      if (patches.length > 0) {
        const updatedMonths = await updateManagedPropertyIncomeMonths(patches);
        setMonths((current) =>
          current.map(
            (month) =>
              updatedMonths.find((item) => item.id === month.id) ?? month,
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save credit setup",
      );
    } finally {
      setSaving(false);
    }
  }

  async function applyPrimarySchedule() {
    await applyRentSchedule();
    if (isNorthStarWorkspace) {
      await applyTuitionSetup();
    } else {
      await applyCreditSetup();
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

  async function markTuitionPaid(month: ManagedPropertyIncomeMonth) {
    const state =
      northStarMonthState.get(month.id) ?? defaultNorthStarBudgetState();
    await patchNorthStarBudget(month, {
      ...state,
      tuition_paid: !state.tuition_paid,
    });
  }


  async function markCreditPaid(month: ManagedPropertyIncomeMonth) {
    const state =
      unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
    const nextPaid = !state.credit_paid;
    await patchUnit19Budget(month, {
      ...state,
      credit_paid: nextPaid,
      credit_paid_date: nextPaid ? state.credit_paid_date || todayIso() : null,
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
      setError(
        err instanceof Error ? err.message : "Failed to save owner expense",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    try {
      setSaving(true);
      setError(null);
      await deleteManagedPropertyIncomeOwnerExpense(id);
      setOwnerExpenses((current) =>
        current.filter((expense) => expense.id !== id),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete owner expense",
      );
    } finally {
      setSaving(false);
    }
  }

  async function patchTaxReserve(patch: Partial<ManagedPropertyTaxReserve>) {
    if (!taxReserve) return;

    try {
      setSaving(true);
      setError(null);

      const updated = await updateManagedPropertyTaxReserve(
        taxReserve.id,
        patch,
      );
      setTaxReserve(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save tax reserve",
      );
    } finally {
      setSaving(false);
    }
  }

  function changeYear(nextYear: number) {
    const safeYear = Math.max(MIN_YEAR, Math.round(nextYear || DEFAULT_YEAR));
    setYear(safeYear);
  }

  if (!open) return null;

  const cockpitLabel = "Budget cockpit · DB live";
  const titleLabel = `${projectLabel} Budget`;
  const applyLabel = saving
    ? "Saving..."
    : isNorthStarWorkspace
      ? "Apply schedules"
      : "Apply schedules";

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
                {cockpitLabel}
              </div>
              <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                {titleLabel}
              </h2>
              {error ? (
                <p className="mt-1 text-[12px] font-semibold text-[#9d2f2f]">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Unit19ModalSwitcher
                activePanel="income"
                onSwitchPanel={onSwitchPanel}
                incomeLabel="Budget"
                showRealEstate={propertySlug === "unit-19"}
              />
              <div className="inline-flex items-center gap-1 rounded-[13px] border border-white/[0.76] bg-white/[0.48] p-1">
                <button
                  type="button"
                  onClick={() => void changeYear(year - 1)}
                  disabled={saving || loading || year <= MIN_YEAR}
                  className="rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ←
                </button>
                <span className="min-w-[54px] text-center text-[12px] font-semibold text-[#0b1623]">
                  {year}
                </span>
                <button
                  type="button"
                  onClick={() => void changeYear(year + 1)}
                  disabled={saving || loading}
                  className="rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                onClick={applyPrimarySchedule}
                disabled={saving || loading || months.length === 0}
                className="rounded-[13px] border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-4 py-2.5 text-[12px] font-semibold text-[#0f7448] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#20a76b]/[0.13] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applyLabel}
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
            {isNorthStarWorkspace ? (
              <>
                <StatCard
                  label="Rent"
                  value={formatEur(stats.collectedRent)}
                  detail={`${formatEur(stats.expectedRent)} scheduled`}
                  tone={
                    stats.expectedRent > stats.collectedRent ? "warn" : "ok"
                  }
                />
                <StatCard
                  label="Tuition fees"
                  value={formatEur(stats.tuitionExpected)}
                  detail={`${formatEur(stats.tuitionPaid)} marked paid`}
                  tone={
                    stats.tuitionExpected > stats.tuitionPaid ? "warn" : "ok"
                  }
                />
                <StatCard
                  label="Confirmed income"
                  value={formatEur(stats.northStarIncome)}
                  detail="DUO, allowance, salary"
                  tone="ok"
                />
                <StatCard
                  label="Monthly expenses"
                  value={formatEur(stats.northStarExpenses)}
                  detail="tracked checks only"
                />
                <StatCard
                  label="Net estimate"
                  value={formatEur(stats.northStarNetEstimate)}
                  detail="income minus planned outflow"
                  tone={stats.northStarNetEstimate >= 0 ? "ok" : "warn"}
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Rent"
                  value={formatEur(stats.collectedRent)}
                  detail={`${formatEur(stats.expectedRent)} scheduled`}
                  tone={stats.expectedRent > stats.collectedRent ? "warn" : "ok"}
                />
                <StatCard
                  label="Credit"
                  value={formatEur(stats.creditPaid)}
                  detail={`${formatEur(stats.creditExpected)} scheduled`}
                  tone={stats.creditExpected > stats.creditPaid ? "warn" : "ok"}
                />
                <StatCard
                  label="Owner costs"
                  value={formatEur(stats.ownerExpenses + stats.unit19TrackedExpenses)}
                  detail="utilities, insurance, repairs"
                  tone="base"
                />
                <StatCard
                  label="Tax reserve"
                  value={formatEur(stats.estimatedTax)}
                  detail="estimated from paid rent"
                  tone={isTaxDue(taxReserve) ? "warn" : "base"}
                />
                <StatCard
                  label="Net estimate"
                  value={formatEur(stats.netAfterOwnerCosts)}
                  detail="rent minus credit and costs"
                  tone={stats.netAfterOwnerCosts >= 0 ? "ok" : "warn"}
                />
              </>
            )}
          </div>
        </div>

        <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[258px_minmax(0,1fr)_330px]">
          <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.42] p-3.5 lg:border-b-0 lg:border-r">
            {isNorthStarWorkspace ? (
              <ScheduleSetupCard
                title="Rent setup"
                year={year}
                amountLabel="Monthly rent"
                amount={monthlyRentEur}
                startMonth={rentStartMonth}
                endMonth={rentEndMonth}
                onYearChange={(value) => void changeYear(value)}
                onAmountChange={setMonthlyRentEur}
                onStartMonthChange={setRentStartMonth}
                onEndMonthChange={setRentEndMonth}
              />
            ) : (
              <Unit19SetupPanel
                mode={setupMode}
                onModeChange={setSetupMode}
                year={year}
                rentAmount={monthlyRentEur}
                rentStartMonth={rentStartMonth}
                rentEndMonth={rentEndMonth}
                creditAmount={creditPaymentEur}
                creditStartMonth={creditStartMonth}
                creditEndMonth={creditEndMonth}
                lifeInsuranceAmount={lifeInsuranceEur}
                propertyInsuranceAmount={propertyInsuranceEur}
                propertyInsuranceMonth={propertyInsuranceMonth}
                onYearChange={(value) => void changeYear(value)}
                onRentAmountChange={setMonthlyRentEur}
                onRentStartMonthChange={setRentStartMonth}
                onRentEndMonthChange={setRentEndMonth}
                onCreditAmountChange={setCreditPaymentEur}
                onCreditStartMonthChange={setCreditStartMonth}
                onCreditEndMonthChange={setCreditEndMonth}
                onLifeInsuranceAmountChange={setLifeInsuranceEur}
                onPropertyInsuranceAmountChange={setPropertyInsuranceEur}
                onPropertyInsuranceMonthChange={setPropertyInsuranceMonth}
              />
            )}

            {isNorthStarWorkspace ? (
              <div className="mt-2.5">
                <ScheduleSetupCard
                  title="Tuition fees setup"
                  year={year}
                  amountLabel="Tuition fee"
                  amount={tuitionAmountEur}
                  startMonth={tuitionStartMonth}
                  endMonth={tuitionEndMonth}
                  onYearChange={(value) => void changeYear(value)}
                  onAmountChange={setTuitionAmountEur}
                  onStartMonthChange={setTuitionStartMonth}
                  onEndMonthChange={setTuitionEndMonth}
                  paymentMode={tuitionPaymentMode}
                  onPaymentModeChange={setTuitionPaymentMode}
                />
              </div>
            ) : (
              <TaxReservePanel
                taxReserve={taxReserve}
                statsEstimatedTax={stats.estimatedTax}
                onPatchTaxReserve={(patch) => void patchTaxReserve(patch)}
              />
            )}
          </aside>

          <main className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
            {loading ? (
              <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] p-6 text-[13px] font-semibold text-[#607993]">
                Loading income data...
              </div>
            ) : (
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {months.map((month) => {
                  const monthSelected = selectedMonth === month.month;
                  const expected = month.rent_expected_eur > 0;
                  const monthExpenses = expensesByMonthId.get(month.id) ?? [];
                  const ownerCostTotal = monthExpenses.reduce(
                    (sum, expense) => sum + expense.amount_eur,
                    0,
                  );
                  const utilityCount = utilityOrder.filter(
                    (key) => month[key],
                  ).length;
                  const northStarState =
                    northStarMonthState.get(month.id) ??
                    defaultNorthStarBudgetState();
                  const northStarTotals = getBudgetTotals(northStarState);
                  const tuitionExpected = getTuitionExpectedForState(
                    month.month,
                    tuitionConfig,
                    northStarState,
                  );
                  const unit19State =
                    unit19MonthState.get(month.id) ?? defaultUnit19BudgetState();
                  const unit19Totals = getUnit19BudgetTotals(unit19State);
                  const creditExpected = getCreditExpectedForState(
                    month.month,
                    unit19CreditConfig,
                    unit19State,
                  );

                  return (
                    <button
                      key={month.id}
                      type="button"
                      onClick={() => setSelectedMonth(month.month)}
                      className={[
                        "min-h-[170px] rounded-[18px] border p-3 text-left shadow-[0_10px_28px_rgba(41,73,112,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.74] active:scale-[0.99]",
                        monthSelected
                          ? "border-[#2f80ed]/[0.34] bg-[#2f80ed]/[0.07]"
                          : "border-white/[0.78] bg-white/[0.58]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-semibold text-[#0b1623]">
                            {monthLabels[month.month - 1]}
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-[#7a90a8]">
                            {month.year}
                          </div>
                        </div>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em]",
                            !expected
                              ? "border-[#9ab0c4]/[0.24] bg-[#9ab0c4]/[0.08] text-[#607993]"
                              : month.rent_status === "paid"
                                ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]"
                                : "border-[#d96969]/[0.28] bg-[#d96969]/[0.08] text-[#9d2f2f]",
                          ].join(" ")}
                        >
                          {!expected
                            ? "No rent"
                            : month.rent_status === "paid"
                              ? "Paid"
                              : month.rent_status === "partial"
                                ? "Partial"
                                : "Unpaid"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                          <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">
                            {isNorthStarWorkspace ? "Rent" : "Rent"}
                          </div>
                          <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">
                            {formatEur(
                              isNorthStarWorkspace
                                ? month.rent_paid_eur
                                : month.rent_status === "paid"
                                  ? month.rent_paid_eur
                                  : month.rent_expected_eur,
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.52] px-2.5 py-2">
                          <div className="text-[9px] uppercase tracking-[0.12em] text-[#7a90a8]">
                            {isNorthStarWorkspace ? "Tuition" : "Credit"}
                          </div>
                          <div className="mt-1 text-[15px] font-semibold text-[#0b1623]">
                            {formatEur(
                              isNorthStarWorkspace
                                ? northStarState.tuition_paid
                                  ? tuitionExpected
                                  : 0
                                : unit19State.credit_paid
                                  ? creditExpected
                                  : creditExpected,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {isNorthStarWorkspace ? (
                          <>
                            <span className="rounded-full border border-[#ccd9e8] bg-white/[0.52] px-2 py-0.5 text-[10px] text-[#607993]">
                              Income {northStarTotals.incomeChecked}/
                              {northStarIncomeEntries.length}
                            </span>
                            <span className="rounded-full border border-[#ccd9e8] bg-white/[0.52] px-2 py-0.5 text-[10px] text-[#607993]">
                              Monthly expenses {northStarTotals.expenseChecked}/
                              {northStarExpenseEntries.length}
                            </span>
                            {northStarTotals.income > 0 ? (
                              <span className="rounded-full border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-2 py-0.5 text-[10px] text-[#0f7448]">
                                +{formatEur(northStarTotals.income)}
                              </span>
                            ) : null}
                            {northStarTotals.expenses > 0 ? (
                              <span className="rounded-full border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2 py-0.5 text-[10px] text-[#8c5947]">
                                -{formatEur(northStarTotals.expenses)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span className="rounded-full border border-[#ccd9e8] bg-white/[0.52] px-2 py-0.5 text-[10px] text-[#607993]">
                              Checks {unit19Totals.checkedCount}/
                              {unit19BudgetEntries.length}
                            </span>
                            {unit19Totals.expenses > 0 ? (
                              <span className="rounded-full border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2 py-0.5 text-[10px] text-[#8c5947]">
                                -{formatEur(unit19Totals.expenses)}
                              </span>
                            ) : null}
                            {ownerCostTotal > 0 ? (
                              <span className="rounded-full border border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] px-2 py-0.5 text-[10px] text-[#8c5947]">
                                Owner {formatEur(ownerCostTotal)}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>

                    </button>
                  );
                })}
              </div>
            )}
          </main>

          <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-white/[0.65] bg-white/[0.36] p-3.5 lg:border-l lg:border-t-0">
            {selected ? (
              isNorthStarWorkspace ? (
                <NorthStarMonthDetails
                  month={selected}
                  tuitionExpected={getTuitionExpectedForState(
                    selected.month,
                    tuitionConfig,
                    northStarMonthState.get(selected.id) ??
                      defaultNorthStarBudgetState(),
                  )}
                  tuitionPaymentMode={tuitionPaymentMode}
                  budgetState={
                    northStarMonthState.get(selected.id) ??
                    defaultNorthStarBudgetState()
                  }
                  onToggleRentPaid={() => void markRentPaid(selected)}
                  onToggleTuitionPaid={() => void markTuitionPaid(selected)}
                  onPatchBudget={(state) =>
                    void patchNorthStarBudget(selected, state)
                  }
                />
              ) : (
                <MonthDetails
                  month={selected}
                  ownerExpenses={expensesByMonthId.get(selected.id) ?? []}
                  detailsMode={detailsMode}
                  onDetailsModeChange={setDetailsMode}
                  budgetState={
                    unit19MonthState.get(selected.id) ?? defaultUnit19BudgetState()
                  }
                  creditExpected={getCreditExpectedForState(
                    selected.month,
                    unit19CreditConfig,
                    unit19MonthState.get(selected.id) ?? defaultUnit19BudgetState(),
                  )}
                  onTogglePaid={() => void markRentPaid(selected)}
                  onToggleCreditPaid={() => void markCreditPaid(selected)}
                  onPatch={(patch) => void patchMonth(selected, patch)}
                  onPatchBudget={(state) => void patchUnit19Budget(selected, state)}
                  onToggleUtility={(key) => void toggleUtility(selected, key)}
                  onAddExpense={() =>
                    setExpenseDraft({
                      monthId: selected.id,
                      title: "",
                      amountEur: 0,
                    })
                  }
                  onDeleteExpense={(id) => void deleteExpense(id)}
                />
              )
            ) : (
              <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 text-[12px] text-[#607993]">
                No month selected.
              </div>
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

function StatCard({
  label,
  value,
  detail,
  tone = "base",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "base" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
      : tone === "warn"
        ? "border-[#d96969]/[0.24] bg-[#d96969]/[0.08] text-[#9d2f2f]"
        : "border-white/[0.80] bg-white/[0.62] text-[#7a90a8]";

  return (
    <div
      className={[
        "rounded-[16px] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]",
        toneClass,
      ].join(" ")}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.13em]">
        {label}
      </div>
      <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">
        {value}
      </div>
      <div className="mt-1 text-[10px]">{detail}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">
        {label}
      </span>
      {children}
    </label>
  );
}

function MonthSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={inputClass}
    >
      {monthLabels.map((label, index) => (
        <option key={label} value={index + 1}>
          {label.slice(0, 3)}
        </option>
      ))}
    </select>
  );
}

function Unit19SetupPanel({
  mode,
  onModeChange,
  year,
  rentAmount,
  rentStartMonth,
  rentEndMonth,
  creditAmount,
  creditStartMonth,
  creditEndMonth,
  lifeInsuranceAmount,
  propertyInsuranceAmount,
  propertyInsuranceMonth,
  onYearChange,
  onRentAmountChange,
  onRentStartMonthChange,
  onRentEndMonthChange,
  onCreditAmountChange,
  onCreditStartMonthChange,
  onCreditEndMonthChange,
  onLifeInsuranceAmountChange,
  onPropertyInsuranceAmountChange,
  onPropertyInsuranceMonthChange,
}: {
  mode: "rent" | "credit";
  onModeChange: (mode: "rent" | "credit") => void;
  year: number;
  rentAmount: number;
  rentStartMonth: number;
  rentEndMonth: number;
  creditAmount: number;
  creditStartMonth: number;
  creditEndMonth: number;
  lifeInsuranceAmount: number;
  propertyInsuranceAmount: number;
  propertyInsuranceMonth: number;
  onYearChange: (year: number) => void;
  onRentAmountChange: (value: number) => void;
  onRentStartMonthChange: (value: number) => void;
  onRentEndMonthChange: (value: number) => void;
  onCreditAmountChange: (value: number) => void;
  onCreditStartMonthChange: (value: number) => void;
  onCreditEndMonthChange: (value: number) => void;
  onLifeInsuranceAmountChange: (value: number) => void;
  onPropertyInsuranceAmountChange: (value: number) => void;
  onPropertyInsuranceMonthChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          {mode === "rent" ? "Rent setup" : "Credit setup"}
        </div>
        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as "rent" | "credit")}
          className="rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-2 py-1 text-[11px] font-semibold text-[#4e6880] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
        >
          <option value="rent">Rent setup</option>
          <option value="credit">Credit setup</option>
        </select>
      </div>

      {mode === "rent" ? (
        <div className="space-y-2">
          <Field label="Year">
            <input
              type="number"
              value={year}
              min={MIN_YEAR}
              onChange={(event) => onYearChange(Number(event.target.value || DEFAULT_YEAR))}
              className={inputClass}
            />
          </Field>
          <Field label="Monthly rent">
            <input
              type="number"
              value={rentAmount}
              onChange={(event) => onRentAmountChange(Number(event.target.value || 0))}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <select
                value={rentStartMonth}
                onChange={(event) => onRentStartMonthChange(Number(event.target.value))}
                className={inputClass}
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To">
              <select
                value={rentEndMonth}
                onChange={(event) => onRentEndMonthChange(Number(event.target.value))}
                className={inputClass}
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="Year">
            <input
              type="number"
              value={year}
              min={MIN_YEAR}
              onChange={(event) => onYearChange(Number(event.target.value || DEFAULT_YEAR))}
              className={inputClass}
            />
          </Field>
          <Field label="Monthly credit payment">
            <input
              type="number"
              value={creditAmount}
              onChange={(event) => onCreditAmountChange(Number(event.target.value || 0))}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <select
                value={creditStartMonth}
                onChange={(event) => onCreditStartMonthChange(Number(event.target.value))}
                className={inputClass}
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To">
              <select
                value={creditEndMonth}
                onChange={(event) => onCreditEndMonthChange(Number(event.target.value))}
                className={inputClass}
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label.slice(0, 3)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Life insurance / month">
            <input
              type="number"
              value={lifeInsuranceAmount}
              onChange={(event) => onLifeInsuranceAmountChange(Number(event.target.value || 0))}
              className={inputClass}
            />
          </Field>
          <Field label="Property insurance / year">
            <input
              type="number"
              value={propertyInsuranceAmount}
              onChange={(event) => onPropertyInsuranceAmountChange(Number(event.target.value || 0))}
              className={inputClass}
            />
          </Field>
          <Field label="Property insurance month">
            <select
              value={propertyInsuranceMonth}
              onChange={(event) => onPropertyInsuranceMonthChange(Number(event.target.value))}
              className={inputClass}
            >
              {monthLabels.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function ScheduleSetupCard({
  title,
  year,
  amountLabel,
  amount,
  startMonth,
  endMonth,
  onYearChange,
  onAmountChange,
  onStartMonthChange,
  onEndMonthChange,
  paymentMode,
  onPaymentModeChange,
}: {
  title: string;
  year: number;
  amountLabel: string;
  amount: number;
  startMonth: number;
  endMonth: number;
  onYearChange: (value: number) => void;
  onAmountChange: (value: number) => void;
  onStartMonthChange: (value: number) => void;
  onEndMonthChange: (value: number) => void;
  paymentMode?: "monthly" | "once";
  onPaymentModeChange?: (value: "monthly" | "once") => void;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
        {title}
      </div>
      <div className="space-y-2">
        <Field label="Year">
          <input
            type="number"
            min={MIN_YEAR}
            value={year}
            onChange={(event) =>
              onYearChange(Number(event.target.value || DEFAULT_YEAR))
            }
            className={inputClass}
          />
        </Field>
        <Field label={amountLabel}>
          <input
            type="number"
            value={amount}
            onChange={(event) =>
              onAmountChange(Number(event.target.value || 0))
            }
            className={inputClass}
          />
        </Field>
        {onPaymentModeChange ? (
          <Field label="Payment mode">
            <select
              value={paymentMode ?? "monthly"}
              onChange={(event) =>
                onPaymentModeChange(
                  event.target.value === "once" ? "once" : "monthly",
                )
              }
              className={inputClass}
            >
              <option value="monthly">Monthly</option>
              <option value="once">One-time</option>
            </select>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <MonthSelect value={startMonth} onChange={onStartMonthChange} />
          </Field>
          <Field label="To">
            <MonthSelect value={endMonth} onChange={onEndMonthChange} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function TaxReservePanel({
  taxReserve,
  statsEstimatedTax,
  onPatchTaxReserve,
}: {
  taxReserve: ManagedPropertyTaxReserve | null;
  statsEstimatedTax: number;
  onPatchTaxReserve: (patch: Partial<ManagedPropertyTaxReserve>) => void;
}) {
  return (
    <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
        Tax reserve
      </div>
      <div className="space-y-2">
        <Field label="Rate %">
          <input
            type="number"
            value={taxReserve?.tax_rate_percent ?? 15}
            onChange={(event) =>
              onPatchTaxReserve({
                tax_rate_percent: Number(event.target.value || 0),
                estimated_tax_eur: statsEstimatedTax,
              })
            }
            className={inputClass}
          />
        </Field>
        <Field label="Due date">
          <AdminDatePicker
            value={taxReserve?.due_date ?? ""}
            onChange={(date) => onPatchTaxReserve({ due_date: date })}
          />
        </Field>
        <button
          type="button"
          onClick={() =>
            onPatchTaxReserve({
              paid: !taxReserve?.paid,
              paid_date: !taxReserve?.paid ? todayIso() : null,
            })
          }
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
          {taxReserve?.paid
            ? "Tax marked paid"
            : isTaxDue(taxReserve)
              ? "Tax due / unpaid"
              : "Tax pending"}
        </button>
        <div className="rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2 text-[11px] leading-4 text-[#607993]">
          Estimate:{" "}
          <span className="font-semibold text-[#0b1623]">
            {formatEur(statsEstimatedTax)}
          </span>
          . Editable reserve only; verify with accountant before payment.
        </div>
      </div>
    </div>
  );
}

function MonthDetails({
  month,
  ownerExpenses,
  detailsMode,
  onDetailsModeChange,
  budgetState,
  creditExpected,
  onTogglePaid,
  onToggleCreditPaid,
  onPatch,
  onPatchBudget,
  onToggleUtility,
  onAddExpense,
  onDeleteExpense,
}: {
  month: ManagedPropertyIncomeMonth;
  ownerExpenses: ManagedPropertyIncomeOwnerExpense[];
  detailsMode: "rent" | "credit";
  onDetailsModeChange: (mode: "rent" | "credit") => void;
  budgetState: Unit19BudgetState;
  creditExpected: number;
  onTogglePaid: () => void;
  onToggleCreditPaid: () => void;
  onPatch: (patch: ManagedPropertyIncomeMonthPatch) => void;
  onPatchBudget: (state: Unit19BudgetState) => void;
  onToggleUtility: (key: UtilityKey) => void;
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
}) {
  function patchEntry(
    key: Unit19BudgetKey,
    patch: { checked?: boolean; amount_eur?: number },
  ) {
    const currentEntry = budgetState.entries?.[key] ?? {};
    onPatchBudget({
      ...budgetState,
      entries: {
        ...(budgetState.entries ?? {}),
        [key]: { ...currentEntry, ...patch },
      },
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          Selected month
        </div>
        <div className="text-[17px] font-semibold text-[#0b1623]">
          {monthLabels[month.month - 1]}
        </div>
        <div className="mt-1 text-[11px] text-[#7a90a8]">
          Rent, credit and owner budget checks
        </div>

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

        <button
          type="button"
          onClick={onToggleCreditPaid}
          disabled={creditExpected <= 0}
          className={[
            "mt-2 w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
            budgetState.credit_paid
              ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
              : "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]",
          ].join(" ")}
        >
          {budgetState.credit_paid
            ? `Credit paid · ${formatEur(creditExpected)}`
            : `Mark credit paid · ${formatEur(creditExpected)}`}
        </button>
      </div>

      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
            {detailsMode === "rent" ? "Rent details" : "Credit details"}
          </div>
          <select
            value={detailsMode}
            onChange={(event) =>
              onDetailsModeChange(event.target.value as "rent" | "credit")
            }
            className="rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-2 py-1 text-[11px] font-semibold text-[#4e6880] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
          >
            <option value="rent">Rent details</option>
            <option value="credit">Credit details</option>
          </select>
        </div>

        {detailsMode === "rent" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Expected">
                <input
                  type="number"
                  value={month.rent_expected_eur}
                  onChange={(event) => {
                    const expected = Number(event.target.value || 0);
                    onPatch({
                      rent_expected_eur: expected,
                      rent_status: deriveRentStatus(expected, month.rent_paid_eur),
                    });
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
                    onPatch({
                      rent_paid_eur: paid,
                      rent_status: deriveRentStatus(month.rent_expected_eur, paid),
                    });
                  }}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-2">
              <Field label="Paid date">
                <AdminDatePicker
                  value={month.rent_paid_date ?? ""}
                  onChange={(date) => onPatch({ rent_paid_date: date })}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Expected">
                <input
                  type="number"
                  value={creditExpected}
                  onChange={(event) =>
                    onPatchBudget({
                      ...budgetState,
                      credit_expected_eur: Number(event.target.value || 0),
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Paid">
                <input
                  type="number"
                  value={budgetState.credit_paid ? creditExpected : 0}
                  readOnly
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-2">
              <Field label="Paid date">
                <AdminDatePicker
                  value={budgetState.credit_paid_date ?? ""}
                  onChange={(date) =>
                    onPatchBudget({ ...budgetState, credit_paid_date: date })
                  }
                />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          Utilities / Insurance
        </div>
        <div className="space-y-1.5">
          {unit19BudgetEntries.map((entry) => (
            <Unit19BudgetEntryRow
              key={entry.key}
              entry={entry}
              checked={getUnit19BudgetChecked(budgetState, entry.key)}
              amount={getUnit19BudgetAmount(budgetState, entry.key)}
              onToggle={() => {
                if (entry.defaultCheckedFrom) onToggleUtility(entry.defaultCheckedFrom);
                patchEntry(entry.key, {
                  checked: !getUnit19BudgetChecked(budgetState, entry.key),
                });
              }}
              onAmountChange={(amount) =>
                patchEntry(entry.key, { amount_eur: amount })
              }
            />
          ))}
        </div>
      </div>

      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
            Owner expenses
          </div>
          <button
            type="button"
            onClick={onAddExpense}
            className="rounded-lg border border-[#ccd9e8] bg-white/[0.62] px-2 py-1 text-[10.5px] font-semibold text-[#4e6880] transition hover:bg-white/[0.88]"
          >
            Add
          </button>
        </div>
        <div className="space-y-1.5">
          {ownerExpenses.length === 0 ? (
            <div className="text-[12px] text-[#7a90a8]">
              No owner expenses this month.
            </div>
          ) : (
            ownerExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#ccd9e8] bg-white/[0.56] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-[#0b1623]">
                    {expense.title}
                  </div>
                  <div className="text-[10.5px] text-[#7a90a8]">
                    {formatEur(expense.amount_eur)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteExpense(expense.id)}
                  className="text-[11px] font-semibold text-[#9d2f2f] transition hover:text-[#6f1f1f]"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NorthStarMonthDetails({
  month,
  tuitionExpected,
  tuitionPaymentMode,
  budgetState,
  onToggleRentPaid,
  onToggleTuitionPaid,
  onPatchBudget,
}: {
  month: ManagedPropertyIncomeMonth;
  tuitionExpected: number;
  tuitionPaymentMode: "monthly" | "once";
  budgetState: NorthStarBudgetState;
  onToggleRentPaid: () => void;
  onToggleTuitionPaid: () => void;
  onPatchBudget: (state: NorthStarBudgetState) => void;
}) {
  const showTuitionButton = tuitionExpected > 0;

  function patchEntry(
    key: NorthStarBudgetKey,
    patch: { checked?: boolean; amount_eur?: number },
  ) {
    const currentEntry = budgetState.entries?.[key] ?? {};
    onPatchBudget({
      ...budgetState,
      entries: {
        ...(budgetState.entries ?? {}),
        [key]: { ...currentEntry, ...patch },
      },
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          Selected month
        </div>
        <div className="text-[17px] font-semibold text-[#0b1623]">
          {monthLabels[month.month - 1]}
        </div>
        <div className="mt-1 text-[11px] text-[#7a90a8]">
          Rent, tuition and monthly budget checks
        </div>

        <button
          type="button"
          onClick={onToggleRentPaid}
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

        {showTuitionButton ? (
          <button
            type="button"
            onClick={onToggleTuitionPaid}
            className={[
              "mt-2 w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
              budgetState.tuition_paid
                ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
                : "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]",
            ].join(" ")}
          >
            {budgetState.tuition_paid
              ? `Tuition paid · ${formatEur(tuitionExpected)}`
              : `Mark tuition paid · ${formatEur(tuitionExpected)}`}
          </button>
        ) : (
          <div className="mt-2 rounded-xl border border-[#ccd9e8] bg-white/[0.50] px-3 py-2 text-[11px] text-[#607993]">
            No tuition expected this month
            {tuitionPaymentMode === "once" ? " under the one-time setup" : ""}.
          </div>
        )}
      </div>

      <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          Income / Monthly expenses
        </div>
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">
              Monthly expenses
            </div>
            <div className="space-y-1.5">
              {northStarExpenseEntries.map((entry) => (
                <BudgetEntryRow
                  key={entry.key}
                  entry={entry}
                  checked={getBudgetChecked(budgetState, entry.key)}
                  amount={getBudgetAmount(budgetState, entry.key)}
                  onToggle={() =>
                    patchEntry(entry.key, {
                      checked: !getBudgetChecked(budgetState, entry.key),
                    })
                  }
                  onAmountChange={(amount) =>
                    patchEntry(entry.key, { amount_eur: amount })
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#7a90a8]">
              Income
            </div>
            <div className="space-y-1.5">
              {northStarIncomeEntries.map((entry) => (
                <BudgetEntryRow
                  key={entry.key}
                  entry={entry}
                  checked={getBudgetChecked(budgetState, entry.key)}
                  amount={getBudgetAmount(budgetState, entry.key)}
                  onToggle={() =>
                    patchEntry(entry.key, {
                      checked: !getBudgetChecked(budgetState, entry.key),
                    })
                  }
                  onAmountChange={(amount) =>
                    patchEntry(entry.key, { amount_eur: amount })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Unit19BudgetEntryRow({
  entry,
  checked,
  amount,
  onToggle,
  onAmountChange,
}: {
  entry: Unit19BudgetEntry;
  checked: boolean;
  amount: number;
  onToggle: () => void;
  onAmountChange: (amount: number) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={[
          "rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
          checked
            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
            : "border-[#ccd9e8] bg-white/[0.56] text-[#607993]",
        ].join(" ")}
      >
        {checked ? "✓ " : "○ "}
        {entry.label}
      </button>
      <input
        key={`${entry.key}-${amount}`}
        type="number"
        defaultValue={amount || ""}
        onBlur={(event) => onAmountChange(Number(event.target.value || 0))}
        className="rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-2 py-2 text-[11px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
        placeholder="€"
      />
    </div>
  );
}

function BudgetEntryRow({
  entry,
  checked,
  amount,
  onToggle,
  onAmountChange,
}: {
  entry: NorthStarBudgetEntry;
  checked: boolean;
  amount: number;
  onToggle: () => void;
  onAmountChange: (amount: number) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={[
          "rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition hover:-translate-y-0.5 active:scale-[0.98]",
          checked
            ? "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] text-[#0f7448]"
            : "border-[#ccd9e8] bg-white/[0.56] text-[#607993]",
        ].join(" ")}
      >
        {checked ? "✓ " : "○ "}
        {entry.label}
      </button>
      <input
        key={`${entry.key}-${amount}`}
        type="number"
        defaultValue={amount || ""}
        onBlur={(event) => onAmountChange(Number(event.target.value || 0))}
        className="rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-2 py-2 text-[11px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
        placeholder="€"
      />
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
        <div className="mb-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">
          Owner expense
        </div>
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              className={inputClass}
              autoFocus
            />
          </Field>
          <Field label="Amount EUR">
            <input
              type="number"
              value={draft.amountEur}
              onChange={(event) =>
                onChange({
                  ...draft,
                  amountEur: Number(event.target.value || 0),
                })
              }
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] px-4 py-2 text-[12px] font-semibold text-[#607993] transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-4 py-2 text-[12px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]"
          >
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
}
