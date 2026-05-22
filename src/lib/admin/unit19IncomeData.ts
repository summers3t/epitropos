export type Unit19UtilityKey = "electricity" | "water" | "gas" | "building_fees";

export type Unit19OwnerExpense = {
    id: string;
    title: string;
    amountEur: number;
};

export type Unit19IncomeMonth = {
    month: number;
    expectedRentEur: number;
    paidRentEur: number;
    rentPaid: boolean;
    paidDate?: string;
    utilities: Record<Unit19UtilityKey, boolean>;
    ownerExpenses: Unit19OwnerExpense[];
    note?: string;
};

export type Unit19IncomeSettings = {
    year: number;
    monthlyRentEur: number;
    rentStartMonth: number;
    rentEndMonth: number;
    taxRatePercent: number;
    taxDueDate: string;
    taxPaid: boolean;
};

export type Unit19IncomeState = {
    settings: Unit19IncomeSettings;
    months: Unit19IncomeMonth[];
};

export const unit19UtilityLabels: Record<Unit19UtilityKey, string> = {
    electricity: "Electricity",
    water: "Water",
    gas: "Gas",
    building_fees: "Building fees",
};

export const unit19MonthLabels = [
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

export function createIncomeMonths(year: number, monthlyRentEur = 450, startMonth = 5, endMonth = 9): Unit19IncomeMonth[] {
    return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const rentIsExpected = month >= startMonth && month <= endMonth;

        return {
            month,
            expectedRentEur: rentIsExpected ? monthlyRentEur : 0,
            paidRentEur: 0,
            rentPaid: false,
            paidDate: undefined,
            utilities: {
                electricity: false,
                water: false,
                gas: false,
                building_fees: false,
            },
            ownerExpenses: [],
            note: "",
        };
    });
}

export const unit19IncomeSeed: Unit19IncomeState = {
    settings: {
        year: 2026,
        monthlyRentEur: 450,
        rentStartMonth: 5,
        rentEndMonth: 9,
        taxRatePercent: 15,
        taxDueDate: "2027-07-31",
        taxPaid: false,
    },
    months: createIncomeMonths(2026, 450, 5, 9),
};
