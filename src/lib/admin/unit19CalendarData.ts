export type Unit19CalendarItemType =
  | "task"
  | "deadline"
  | "appointment"
  | "payment"
  | "document_followup"
  | "reminder";

export type Unit19CalendarItemStatus = "open" | "done" | "deferred";
export type Unit19CalendarItemPriority = "critical" | "high" | "normal" | "low";

export type Unit19CalendarLinkedRecord = {
  label: string;
  kind: "Task" | "Document" | "Expense" | "Stage" | "Contact";
};

export type Unit19CalendarItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: Unit19CalendarItemType;
  status: Unit19CalendarItemStatus;
  priority: Unit19CalendarItemPriority;
  note?: string;
  location?: string;
  linkedRecords?: Unit19CalendarLinkedRecord[];
};

export const unit19CalendarItemsSeed: Unit19CalendarItem[] = [
  {
    id: "followup-arsi-condition",
    title: "Follow up on άρση of cancellation condition",
    date: "2026-05-25",
    time: "10:00",
    type: "document_followup",
    status: "open",
    priority: "critical",
    note: "Ask lawyer/notary whether the removal act has been signed and when the cadastre registration proof will be available.",
    linkedRecords: [
      { kind: "Document", label: "Πράξη εξόφλησης και άρσης" },
      { kind: "Document", label: "Cadastre extract after άρση" },
    ],
  },
  {
    id: "check-aade-lease-acceptance",
    title: "Check AADE lease acceptance",
    date: "2026-05-26",
    type: "deadline",
    status: "open",
    priority: "high",
    note: "Confirm whether Νικολέτα accepted the AADE rental declaration and whether PEA needs correction in the lease statement.",
    linkedRecords: [
      { kind: "Document", label: "AADE Rental Declaration Receipt" },
      { kind: "Document", label: "Energy Performance Certificate" },
    ],
  },
  {
    id: "bsafe-installation-window",
    title: "Coordinate B-SAFE grille installation access",
    date: "2026-05-27",
    time: "15:30",
    type: "appointment",
    status: "open",
    priority: "high",
    location: "Unit 19, Thessaloniki",
    note: "Coordinate access through Georgios. Confirm installation time several days in advance.",
    linkedRecords: [
      { kind: "Task", label: "Window grilles installation" },
      { kind: "Expense", label: "B-SAFE deposit €280" },
      { kind: "Contact", label: "Georgios / B-SAFE" },
    ],
  },
  {
    id: "panagiotis-insulation-quote",
    title: "Review insulation labor quote",
    date: "2026-05-28",
    type: "task",
    status: "open",
    priority: "normal",
    note: "Check if Panagiotis sends labor quote for NEOTEX N-Thermon internal insulation and kitchen ceiling repair.",
    linkedRecords: [
      { kind: "Task", label: "Internal insulation quote" },
      { kind: "Expense", label: "Repair / insulation budget" },
    ],
  },
  {
    id: "loan-installment-reminder",
    title: "Loan installment check",
    date: "2026-06-10",
    type: "payment",
    status: "open",
    priority: "normal",
    note: "Monthly loan installment date. Confirm payment and update tracking if needed.",
    linkedRecords: [
      { kind: "Expense", label: "DSK mortgage monthly payment" },
    ],
  },
  {
    id: "rent-status-review",
    title: "Review rent status and next lease step",
    date: "2026-06-15",
    type: "reminder",
    status: "open",
    priority: "normal",
    note: "Current rent is €450 until September 2026. Review timing for future rent correction discussion.",
    linkedRecords: [
      { kind: "Task", label: "Rental strategy after September" },
      { kind: "Document", label: "Existing Lease Contract" },
    ],
  },
  {
    id: "utilities-sweep",
    title: "Utilities sweep: electricity / water / gas",
    date: "2026-06-18",
    type: "task",
    status: "open",
    priority: "normal",
    note: "Check what proof is still missing for electricity, water and gas accounts.",
    linkedRecords: [
      { kind: "Document", label: "Water Account Registration" },
      { kind: "Task", label: "Utilities handover" },
    ],
  },
];
