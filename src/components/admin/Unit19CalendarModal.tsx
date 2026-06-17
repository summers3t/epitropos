"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Unit19ModalSwitcher, { type Unit19PanelKey } from "@/components/admin/Unit19ModalSwitcher";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import {
    createManagedPropertyCalendarItem,
    deleteManagedPropertyCalendarItem,
    getManagedPropertyBySlug,
    getManagedPropertyCalendarItems,
    updateManagedPropertyCalendarItem,
    type ManagedPropertyCalendarItem,
    type ManagedPropertyCalendarItemInsert,
    type ManagedPropertyCalendarItemPatch,
    type ManagedPropertyCalendarItemPriority as Unit19CalendarItemPriority,
    type ManagedPropertyCalendarItemStatus as Unit19CalendarItemStatus,
    type ManagedPropertyCalendarItemType as Unit19CalendarItemType,
    type ManagedPropertyCalendarLinkedRecord as Unit19CalendarLinkedRecord,
} from "@/lib/admin/managedPropertiesApi";

type Props = {
    open: boolean;
    onClose: () => void;
    initialDate?: string | null;
    initialItemId?: string | null;
    onInitialTargetConsumed?: () => void;
    onCalendarDataChanged?: () => void;
    onSwitchPanel?: (panel: Unit19PanelKey) => void;
    propertySlug?: string;
    projectLabel?: string;
};

type CalendarView = "agenda" | "week" | "month";
type QuickFilter = "all" | "open" | "overdue" | "critical" | "done";

type Unit19CalendarItem = {
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
    taskId?: string | null;
    sortOrder?: number | null;
};

type DraftCalendarItem = Omit<Unit19CalendarItem, "linkedRecords"> & { linkedText: string };

type CalendarUndoAction = {
    action: "Deleted" | "Updated";
    label: string;
    restore: () => Promise<void>;
    commit?: () => Promise<void>;
};

const typeLabels: Record<Unit19CalendarItemType, string> = {
    task: "Task",
    deadline: "Deadline",
    appointment: "Appointment",
    payment: "Payment",
    document_followup: "Document follow-up",
    reminder: "Reminder",
};

const statusLabels: Record<Unit19CalendarItemStatus, string> = {
    open: "Open",
    done: "Done",
    deferred: "Deferred",
};

const priorityLabels: Record<Unit19CalendarItemPriority, string> = {
    critical: "Critical",
    high: "High",
    normal: "Normal",
    low: "Low",
};

const typeOrder: Unit19CalendarItemType[] = ["task", "deadline", "appointment", "payment", "document_followup", "reminder"];
const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


function isWeekend(date: Date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function getIsoWeekNumber(date: Date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = target.getUTCDay() || 7;

    target.setUTCDate(target.getUTCDate() + 4 - day);

    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatWeekRange(weekStart: Date) {
    const weekEnd = addDays(weekStart, 6);
    const startMonth = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(weekStart);
    const endMonth = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(weekEnd);

    const year = weekStart.getFullYear();

    if (startMonth === endMonth) {
        return `${weekStart.getDate()}-${weekEnd.getDate()} ${endMonth} · ${year}`;
    }

    return `${weekStart.getDate()} ${startMonth}-${weekEnd.getDate()} ${endMonth} · ${year}`;
}

function isTodayDate(date: Date) {
    return toIsoDate(date) === toIsoDate(new Date());
}

function getTimeSortValue(item: Unit19CalendarItem) {
    return item.time?.trim() || "99:99";
}

function sortCalendarItemsForDay(items: Unit19CalendarItem[]) {
    const hasManualOrder = items.some((item) => typeof item.sortOrder === "number");

    return [...items].sort((a, b) => {
        if (hasManualOrder) {
            const orderDiff = (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999);
            if (orderDiff !== 0) return orderDiff;
        }

        const timeDiff = getTimeSortValue(a).localeCompare(getTimeSortValue(b));
        if (timeDiff !== 0) return timeDiff;

        return a.title.localeCompare(b.title);
    });
}

function getNextSortOrderForDate(items: Unit19CalendarItem[], date: string) {
    const sameDateItems = items.filter((item) => item.date === date);
    const maxSortOrder = Math.max(0, ...sameDateItems.map((item) => item.sortOrder ?? 0));

    return maxSortOrder + 1000;
}

function todayStart() {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
}

function parseLocalDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toIsoDate(value: Date) {
    const copy = new Date(value);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function startOfWeek(date: Date) {
    const copy = new Date(date);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDay(date: Date) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(date);
}


function formatMonthTitle(date: Date) {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function isOverdue(item: Unit19CalendarItem) {
    return item.status === "open" && parseLocalDate(item.date) < todayStart();
}

function typeClasses(type: Unit19CalendarItemType) {
    if (type === "deadline") return "border-[#cfa090]/[0.30] bg-[#cfa090]/[0.10] text-[#8c5947]";
    if (type === "appointment") return "border-[#2f80ed]/[0.26] bg-[#2f80ed]/[0.09] text-[#1560bc]";
    if (type === "payment") return "border-[#a68b4a]/[0.28] bg-[#a68b4a]/[0.10] text-[#7a6228]";
    if (type === "document_followup") return "border-[#8a65cc]/[0.24] bg-[#8a65cc]/[0.09] text-[#5e38a0]";
    if (type === "reminder") return "border-[#9ab0c4]/[0.24] bg-[#9ab0c4]/[0.09] text-[#4e6880]";
    return "border-[#20a76b]/[0.22] bg-[#20a76b]/[0.09] text-[#0f7448]";
}

function priorityClasses(priority: Unit19CalendarItemPriority) {
    if (priority === "critical") return "border-[#d96969]/[0.28] bg-[#d96969]/[0.09] text-[#9d2f2f]";
    if (priority === "high") return "border-[#cfa090]/[0.30] bg-[#cfa090]/[0.10] text-[#8c5947]";
    if (priority === "low") return "border-[#9ab0c4]/[0.22] bg-[#9ab0c4]/[0.08] text-[#607993]";
    return "border-[#ccd9e8] bg-white/[0.58] text-[#4e6880]";
}

function statusClasses(status: Unit19CalendarItemStatus, overdue: boolean) {
    if (overdue) return "border-[#d96969]/[0.30] bg-[#d96969]/[0.09] text-[#9d2f2f]";
    if (status === "done") return "border-[#20a76b]/[0.24] bg-[#20a76b]/[0.09] text-[#0f7448]";
    if (status === "deferred") return "border-[#9ab0c4]/[0.26] bg-[#9ab0c4]/[0.10] text-[#4e6880]";
    return "border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] text-[#1560bc]";
}

function blankItem(nextDate: string, nextTime = ""): DraftCalendarItem {
    return {
        id: `calendar-${Date.now()}`,
        title: "New calendar item",
        date: nextDate,
        time: nextTime,
        type: "task",
        status: "open",
        priority: "normal",
        note: "",
        location: "",
        linkedText: "",
    };
}

function linkedRecordsToText(records?: Unit19CalendarLinkedRecord[]) {
    return records?.map((record) => `${record.kind}: ${record.label}`).join("\n") ?? "";
}

function textToLinkedRecords(value: string): Unit19CalendarLinkedRecord[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [kind, ...labelParts] = line.split(":");
            const label = labelParts.join(":").trim() || line;
            const cleanKind = kind.trim();
            const allowedKinds = ["Task", "Document", "Expense", "Stage", "Contact"];

            return {
                kind: allowedKinds.includes(cleanKind) ? (cleanKind as Unit19CalendarLinkedRecord["kind"]) : "Task",
                label,
            };
        });
}

function dbItemToUi(item: ManagedPropertyCalendarItem): Unit19CalendarItem {
    return {
        id: item.id,
        title: item.title,
        date: item.item_date,
        time: item.item_time ?? undefined,
        type: item.type,
        status: item.status,
        priority: item.priority,
        note: item.note ?? undefined,
        location: item.location ?? undefined,
        linkedRecords: Array.isArray(item.linked_records) ? item.linked_records : [],
        taskId: item.task_id,
        sortOrder: item.sort_order,
    };
}

function draftToDbPayload(managedPropertyId: string, item: DraftCalendarItem): ManagedPropertyCalendarItemInsert {
    return {
        managed_property_id: managedPropertyId,
        title: item.title.trim(),
        item_date: item.date,
        item_time: item.time?.trim() || null,
        type: item.type,
        status: item.status,
        priority: item.priority,
        location: item.location?.trim() || null,
        note: item.note?.trim() || null,
        linked_records: textToLinkedRecords(item.linkedText),
        task_id: item.taskId ?? null,
    };
}


function calendarItemToDbPatch(item: Unit19CalendarItem): ManagedPropertyCalendarItemPatch {
    return {
        task_id: item.taskId ?? null,
        title: item.title,
        item_date: item.date,
        item_time: item.time?.trim() || null,
        type: item.type,
        priority: item.priority,
        status: item.status,
        location: item.location?.trim() || null,
        note: item.note?.trim() || null,
        linked_records: item.linkedRecords ?? [],
        sort_order: item.sortOrder ?? null,
    };
}


function IconClose() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function IconCalendar() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2.5" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
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

export default function Unit19CalendarModal({
    open,
    onClose,
    initialDate,
    initialItemId,
    onInitialTargetConsumed,
    onCalendarDataChanged,
    onSwitchPanel,
    propertySlug = "unit-19",
    projectLabel = "Unit 19",
}: Props) {
    const [managedPropertyId, setManagedPropertyId] = useState<string | null>(null);
    const [items, setItems] = useState<Unit19CalendarItem[]>([]);
    const [view, setView] = useState<CalendarView>("agenda");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("open");
    const [typeFilter, setTypeFilter] = useState<Unit19CalendarItemType | "all">("all");
    const [query, setQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [draftItem, setDraftItem] = useState<DraftCalendarItem | null>(null);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [undoAction, setUndoAction] = useState<CalendarUndoAction | null>(null);
    const undoActionRef = useRef<CalendarUndoAction | null>(null);
    const undoTimerRef = useRef<number | null>(null);

    const loadCalendar = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const property = await getManagedPropertyBySlug(propertySlug);
            const calendarItems = await getManagedPropertyCalendarItems(property.id);
            setManagedPropertyId(property.id);
            setItems(calendarItems.map(dbItemToUi));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load calendar data");
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
        void loadCalendar();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [loadCalendar, open, onClose]);

    useEffect(() => {
        if (!open || (!initialDate && !initialItemId)) return;

        if (initialDate) setSelectedDate(initialDate);
        if (initialItemId) setSelectedItemId(initialItemId);

        setView("week");
        setQuickFilter("all");
        setTypeFilter("all");
        setQuery("");
        onInitialTargetConsumed?.();
    }, [initialDate, initialItemId, onInitialTargetConsumed, open]);

    const orderedItems = useMemo(() => {
        return [...items].sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
    }, [items]);

    const stats = useMemo(() => {
        const today = toIsoDate(new Date());
        const weekEnd = toIsoDate(addDays(new Date(), 7));
        return {
            today: items.filter((item) => item.date === today && item.status !== "done").length,
            week: items.filter((item) => item.date >= today && item.date <= weekEnd && item.status !== "done").length,
            overdue: items.filter(isOverdue).length,
            critical: items.filter((item) => item.priority === "critical" && item.status !== "done").length,
        };
    }, [items]);

    const typeTotals = useMemo(() => {
        return typeOrder.map((type) => {
            const count = items.filter((item) => item.type === type).length;
            const openCount = items.filter((item) => item.type === type && item.status !== "done").length;
            return { type, count, openCount };
        });
    }, [items]);

    const filteredItems = useMemo(() => {
        const cleanQuery = query.trim().toLowerCase();

        return orderedItems.filter((item) => {
            if (typeFilter !== "all" && item.type !== typeFilter) return false;
            if (quickFilter === "open" && item.status !== "open") return false;
            if (quickFilter === "done" && item.status !== "done") return false;
            if (quickFilter === "critical" && item.priority !== "critical") return false;
            if (quickFilter === "overdue" && !isOverdue(item)) return false;

            if (!cleanQuery) return true;

            return [
                item.title,
                item.note,
                item.location,
                typeLabels[item.type],
                priorityLabels[item.priority],
                item.linkedRecords?.map((record) => `${record.kind} ${record.label}`).join(" "),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(cleanQuery);
        });
    }, [orderedItems, query, quickFilter, typeFilter]);

    const selectedItem = useMemo(() => {
        return items.find((item) => item.id === selectedItemId) ?? null;
    }, [items, selectedItemId]);

    useEffect(() => {
        return () => {
            if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
            const pending = undoActionRef.current;
            if (pending?.commit) void pending.commit();
        };
    }, []);

    function queueUndo(
        action: CalendarUndoAction["action"],
        label: string,
        restore: () => Promise<void>,
        commit?: () => Promise<void>,
    ) {
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);

        const previous = undoActionRef.current;
        if (previous?.commit) {
            void previous.commit().catch((commitError: unknown) => {
                setError(commitError instanceof Error ? commitError.message : "Failed to finalize calendar change");
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
                    setError(commitError instanceof Error ? commitError.message : "Failed to finalize calendar deletion");
                });
            }
        }, 5000);
    }

    async function saveDraft() {
        if (!draftItem?.title.trim() || !managedPropertyId) return;

        setSaving(true);
        setError(null);

        try {
            const payload = draftToDbPayload(managedPropertyId, draftItem);
            const existingItem = items.find((item) => item.id === draftItem.id);
            const existing = Boolean(existingItem);
            const sortOrder =
                !existingItem || existingItem.date !== draftItem.date
                    ? getNextSortOrderForDate(items, draftItem.date)
                    : existingItem.sortOrder ?? getNextSortOrderForDate(items, draftItem.date);
            const payloadWithSortOrder: ManagedPropertyCalendarItemInsert = { ...payload, sort_order: sortOrder };
            const updatePayload: ManagedPropertyCalendarItemPatch = {
                task_id: payload.task_id,
                title: payload.title,
                item_date: payload.item_date,
                item_time: payload.item_time,
                type: payload.type,
                priority: payload.priority,
                status: payload.status,
                location: payload.location,
                note: payload.note,
                linked_records: payload.linked_records,
                sort_order: sortOrder,
            };

            const saved = existing
                ? await updateManagedPropertyCalendarItem(draftItem.id, updatePayload)
                : await createManagedPropertyCalendarItem(payloadWithSortOrder);

            const cleanItem = dbItemToUi(saved);
            setItems((current) => {
                const exists = current.some((item) => item.id === cleanItem.id);
                if (exists) return current.map((item) => (item.id === cleanItem.id ? cleanItem : item));
                return [...current, cleanItem];
            });
            setSelectedItemId(cleanItem.id);
            setDraftItem(null);

            if (existingItem) {
                queueUndo("Updated", existingItem.title, async () => {
                    const restored = await updateManagedPropertyCalendarItem(cleanItem.id, calendarItemToDbPatch(existingItem));
                    const restoredUi = dbItemToUi(restored);
                    setItems((current) => current.map((item) => (item.id === restoredUi.id ? restoredUi : item)));
                    setSelectedItemId(restoredUi.id);
                    if (restoredUi.taskId) onCalendarDataChanged?.();
                });
            }

            if (cleanItem.taskId) onCalendarDataChanged?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save calendar item");
        } finally {
            setSaving(false);
        }
    }

    function startEdit(item: Unit19CalendarItem) {
        setDraftItem({
            ...item,
            time: item.time ?? "",
            note: item.note ?? "",
            location: item.location ?? "",
            linkedText: linkedRecordsToText(item.linkedRecords),
        });
    }

    function handleItemDragStart(item: Unit19CalendarItem, event: DragEvent<HTMLDivElement>) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        setDraggingItemId(item.id);
        setSelectedItemId(item.id);
    }

    function handleItemDragEnd() {
        setDraggingItemId(null);
    }

    async function moveItemToDate(
        itemId: string,
        date: string,
        targetItemId?: string,
        placement: "before" | "after" | "end" = "end",
    ) {
        const movedItem = items.find((currentItem) => currentItem.id === itemId);
        if (!movedItem) {
            setDraggingItemId(null);
            return;
        }

        const sourceDate = movedItem.date;
        const targetDate = date;

        const targetDayItems = sortCalendarItemsForDay(
            items
                .filter((item) => item.date === targetDate && item.id !== itemId)
                .map((item) => ({ ...item, date: targetDate })),
        );

        const insertIndex =
            targetItemId && placement !== "end"
                ? Math.max(
                      0,
                      targetDayItems.findIndex((item) => item.id === targetItemId) + (placement === "after" ? 1 : 0),
                  )
                : targetDayItems.length;

        const movedForTargetDate = { ...movedItem, date: targetDate };
        const nextTargetDayItems = [
            ...targetDayItems.slice(0, insertIndex),
            movedForTargetDate,
            ...targetDayItems.slice(insertIndex),
        ].map((item, index) => ({
            ...item,
            sortOrder: (index + 1) * 1000,
        }));

        const sourceDayItems =
            sourceDate === targetDate
                ? []
                : sortCalendarItemsForDay(items.filter((item) => item.date === sourceDate && item.id !== itemId)).map(
                      (item, index) => ({
                          ...item,
                          sortOrder: (index + 1) * 1000,
                      }),
                  );

        const updates = [...nextTargetDayItems, ...sourceDayItems];
        const originalItems = updates
            .map((updatedItem) => items.find((item) => item.id === updatedItem.id))
            .filter((item): item is Unit19CalendarItem => Boolean(item));

        setSaving(true);
        setError(null);

        try {
            const savedItems = await Promise.all(
                updates.map((item) =>
                    updateManagedPropertyCalendarItem(item.id, {
                        item_date: item.date,
                        sort_order: item.sortOrder,
                    }),
                ),
            );

            const savedUiItems = savedItems.map(dbItemToUi);
            const savedMap = new Map(savedUiItems.map((item) => [item.id, item]));

            setItems((current) =>
                current.map((currentItem) => savedMap.get(currentItem.id) ?? currentItem),
            );
            setSelectedDate(targetDate);
            setSelectedItemId(itemId);
            queueUndo("Updated", movedItem.title, async () => {
                const restoredItems = await Promise.all(
                    originalItems.map((item) => updateManagedPropertyCalendarItem(item.id, calendarItemToDbPatch(item))),
                );
                const restoredMap = new Map(restoredItems.map((item) => [item.id, dbItemToUi(item)]));
                setItems((current) => current.map((item) => restoredMap.get(item.id) ?? item));
                setSelectedDate(sourceDate);
                setSelectedItemId(itemId);
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to move calendar item");
        } finally {
            setSaving(false);
            setDraggingItemId(null);
        }
    }

    async function markDone(item: Unit19CalendarItem) {
        const nextStatus: Unit19CalendarItemStatus = item.status === "done" ? "open" : "done";
        setSaving(true);
        setError(null);

        try {
            const saved = await updateManagedPropertyCalendarItem(item.id, { status: nextStatus });
            const cleanItem = dbItemToUi(saved);
            setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? cleanItem : currentItem)));
            queueUndo("Updated", item.title, async () => {
                const restored = await updateManagedPropertyCalendarItem(item.id, { status: item.status });
                const restoredUi = dbItemToUi(restored);
                setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? restoredUi : currentItem)));
                if (restoredUi.taskId) onCalendarDataChanged?.();
            });
            if (cleanItem.taskId) onCalendarDataChanged?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update calendar item");
        } finally {
            setSaving(false);
        }
    }

    async function deleteItem(id: string) {
        const deletedItem = items.find((item) => item.id === id);
        if (!deletedItem) return;

        setError(null);
        setItems((current) => current.filter((item) => item.id !== id));
        if (selectedItemId === id) setSelectedItemId(null);
        setDraftItem(null);

        queueUndo(
            "Deleted",
            deletedItem.title,
            async () => {
                setItems((current) =>
                    current.some((item) => item.id === deletedItem.id) ? current : [...current, deletedItem],
                );
                setSelectedItemId(deletedItem.id);
            },
            async () => {
                await deleteManagedPropertyCalendarItem(id);
                if (deletedItem.taskId) onCalendarDataChanged?.();
            },
        );
    }

    function reloadData() {
        setQuickFilter("open");
        setTypeFilter("all");
        setQuery("");
        setSelectedItemId(null);
        setDraftItem(null);
        setDraggingItemId(null);
        void loadCalendar();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] overflow-hidden px-3 py-3 sm:px-5">
            <button
                type="button"
                aria-label="Close calendar modal"
                className="fixed inset-0 cursor-default bg-[#06101d]/[0.52] backdrop-blur-[10px]"
                onClick={onClose}
            />

            <div className="relative mx-auto flex h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-32px)] max-w-[1600px] flex-col overflow-hidden rounded-[26px] border border-white/[0.72] bg-white/[0.74] shadow-[0_30px_120px_rgba(6,16,29,0.38),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(47,128,237,0.13),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(166,139,74,0.15),transparent_24%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.62] to-transparent" />

                <div className="relative shrink-0 border-b border-white/[0.72] px-5 py-3 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">
                                <IconCalendar />
                                Calendar cockpit · DB live
                            </div>
                            <h2 className="font-display text-[28px] font-normal leading-tight tracking-[-0.03em] text-[#0b1623] sm:text-[34px]">
                                {projectLabel} Activity Planner
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Unit19ModalSwitcher activePanel="calendar" onSwitchPanel={onSwitchPanel} incomeLabel="Budget" showRealEstate={propertySlug === "unit-19"} />
                            <button
                                type="button"
                                onClick={() => setDraftItem(blankItem(selectedDate))}
                                className="rounded-[13px] border border-[#a68b4a]/[0.28] bg-[#a68b4a]/[0.10] px-4 py-2.5 text-[12px] font-semibold text-[#7a6228] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a68b4a]/[0.42] hover:bg-[#a68b4a]/[0.16] hover:text-[#0f1c2e] hover:shadow-[0_12px_30px_rgba(166,139,74,0.18)] active:scale-[0.96]"
                            >
                                + Add item
                            </button>
                            <button
                                type="button"
                                onClick={reloadData}
                                className="rounded-[13px] border border-white/[0.78] bg-white/[0.52] px-4 py-2.5 text-[12px] font-semibold text-[#6f849d] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.28] hover:bg-white/[0.86] hover:text-[#2060cc] active:scale-[0.96]"
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

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Today" value={stats.today} detail="open items" />
                        <StatCard label="This week" value={stats.week} detail="next 7 days" />
                        <StatCard label="Overdue" value={stats.overdue} detail="needs attention" tone="warn" />
                        <StatCard label="Critical" value={stats.critical} detail="priority items" tone="risk" />
                    </div>
                </div>

                <div className="relative grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[248px_minmax(0,1fr)]">
                    <aside className="h-full min-h-0 overflow-y-auto overscroll-contain border-b border-white/[0.65] bg-white/[0.42] p-3.5 lg:border-b-0 lg:border-r">
                        <div className="rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Views</div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {(["agenda", "week", "month"] as CalendarView[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setView(mode)}
                                        className={[
                                            "rounded-xl border px-2 py-2 text-[11px] font-semibold capitalize transition-all duration-200 active:scale-[0.97]",
                                            view === mode
                                                ? "border-[#2f80ed]/[0.30] bg-[#2f80ed]/[0.10] text-[#1560bc]"
                                                : "border-[#ccd9e8] bg-white/[0.58] text-[#607993] hover:bg-white/[0.86] hover:text-[#2060cc]",
                                        ].join(" ")}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <MiniDateNavigator
                            selectedDate={selectedDate}
                            view={view}
                            onSelectDate={setSelectedDate}
                        />

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Filters</div>
                            <div className="space-y-1.5">
                                <select
                                    value={quickFilter}
                                    onChange={(event) => setQuickFilter(event.target.value as QuickFilter)}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    <option value="all">All items</option>
                                    <option value="open">Open only</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="critical">Critical</option>
                                    <option value="done">Done</option>
                                </select>

                                <select
                                    value={typeFilter}
                                    onChange={(event) => setTypeFilter(event.target.value as Unit19CalendarItemType | "all")}
                                    className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] px-3 py-1.5 text-[12.5px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                >
                                    <option value="all">All types</option>
                                    {typeOrder.map((type) => (
                                        <option key={type} value={type}>
                                            {typeLabels[type]}
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
                                        placeholder="Search calendar..."
                                        className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.76] py-1.5 pl-8 pr-3 text-[12.5px] text-[#0b1623] outline-none transition placeholder:text-[#9ab0c4] focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Types</div>
                            <div className="space-y-1.5">
                                {typeTotals.map((item) => (
                                    <button
                                        key={item.type}
                                        type="button"
                                        onClick={() => setTypeFilter(item.type)}
                                        className="flex w-full items-center justify-between rounded-xl border border-transparent px-2.5 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[#2f80ed]/[0.20] hover:bg-white/[0.55] active:scale-[0.98]"
                                    >
                                        <span className="text-[11.5px] font-semibold text-[#0b1623]">{typeLabels[item.type]}</span>
                                        <span className="rounded-full border border-[#ccd9e8] bg-white/[0.58] px-2 py-0.5 text-[10px] text-[#607993]">
                                            {item.openCount}/{item.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className="h-full min-h-0 overflow-y-auto overscroll-contain p-3.5">
                        {error ? (
                            <div className="mb-3 rounded-[14px] border border-[#d96969]/[0.26] bg-[#d96969]/[0.08] px-3 py-2 text-[12px] font-semibold text-[#9d2f2f]">
                                {error}
                            </div>
                        ) : null}

                        {loading ? (
                            <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] p-6 text-[13px] font-semibold text-[#607993] shadow-[0_14px_40px_rgba(41,73,112,0.08)]">
                                Loading calendar from database...
                            </div>
                        ) : null}

                        {!loading && view === "agenda" ? (
                            <AgendaView
                                items={filteredItems}
                                selectedItemId={selectedItem?.id ?? null}
                                onSelect={(item) => setSelectedItemId(item.id)}
                                onEdit={startEdit}
                                onDone={markDone}
                            />
                        ) : null}

                        {!loading && view === "week" ? (
                            <WeekView
                                items={filteredItems}
                                selectedDate={selectedDate}
                                draggingItemId={draggingItemId}
                                onSelectDate={setSelectedDate}
                                onSelectItem={(item) => setSelectedItemId(item.id)}
                                onEditItem={startEdit}
                                onAddItem={(date, time) => setDraftItem(blankItem(date, time))}
                                onMoveItem={moveItemToDate}
                                onDragStart={handleItemDragStart}
                                onDragEnd={handleItemDragEnd}
                            />
                        ) : null}

                        {!loading && view === "month" ? (
                            <MonthView
                                items={filteredItems}
                                selectedDate={selectedDate}
                                draggingItemId={draggingItemId}
                                onSelectDate={setSelectedDate}
                                onSelectItem={(item) => setSelectedItemId(item.id)}
                                onEditItem={startEdit}
                                onAddItem={(date) => setDraftItem(blankItem(date))}
                                onMoveItem={moveItemToDate}
                                onDragStart={handleItemDragStart}
                                onDragEnd={handleItemDragEnd}
                            />
                        ) : null}
                    </main>

                </div>

                {selectedItem && !draftItem ? (
                    <QuickItemDetails
                        item={selectedItem}
                        onClose={() => setSelectedItemId(null)}
                        onEdit={startEdit}
                        onDone={markDone}
                    />
                ) : null}

                {draftItem ? (
                    <CalendarEditor
                        item={draftItem}
                        onChange={setDraftItem}
                        saving={saving}
                        onSave={saveDraft}
                        onCancel={() => setDraftItem(null)}
                        onDelete={() => deleteItem(draftItem.id)}
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
                                    setError(restoreError instanceof Error ? restoreError.message : "Failed to undo calendar change");
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

function StatCard({ label, value, detail, tone = "base" }: { label: string; value: number; detail: string; tone?: "base" | "warn" | "risk" }) {
    const toneClass =
        tone === "risk"
            ? "border-[#d96969]/[0.24] bg-[#d96969]/[0.08] text-[#9d2f2f]"
            : tone === "warn"
                ? "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.08] text-[#8c5947]"
                : "border-white/[0.80] bg-white/[0.62] text-[#7a90a8]";

    return (
        <div className={["rounded-[16px] px-3.5 py-2.5 shadow-[0_10px_28px_rgba(41,73,112,0.07)]", toneClass].join(" ")}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em]">{label}</div>
            <div className="mt-1 text-[21px] font-semibold leading-none text-[#0b1623]">{value}</div>
            <div className="mt-1 text-[10px]">{detail}</div>
        </div>
    );
}

function AgendaView({
    items,
    selectedItemId,
    onSelect,
    onEdit,
    onDone,
}: {
    items: Unit19CalendarItem[];
    selectedItemId: string | null;
    onSelect: (item: Unit19CalendarItem) => void;
    onEdit: (item: Unit19CalendarItem) => void;
    onDone: (item: Unit19CalendarItem) => void;
}) {
    const groups = useMemo(() => {
        const today = todayStart();
        const tomorrow = addDays(today, 1);
        const weekEnd = addDays(today, 7);

        const result = [
            { key: "overdue", label: "Overdue", items: [] as Unit19CalendarItem[] },
            { key: "today", label: "Today", items: [] as Unit19CalendarItem[] },
            { key: "tomorrow", label: "Tomorrow", items: [] as Unit19CalendarItem[] },
            { key: "week", label: "This week", items: [] as Unit19CalendarItem[] },
            { key: "later", label: "Later", items: [] as Unit19CalendarItem[] },
        ];

        for (const item of items) {
            const date = parseLocalDate(item.date);
            if (isOverdue(item)) result[0].items.push(item);
            else if (toIsoDate(date) === toIsoDate(today)) result[1].items.push(item);
            else if (toIsoDate(date) === toIsoDate(tomorrow)) result[2].items.push(item);
            else if (date <= weekEnd) result[3].items.push(item);
            else result[4].items.push(item);
        }

        return result.filter((group) => group.items.length > 0);
    }, [items]);

    if (items.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-3">
            {groups.map((group) => (
                <section key={group.key} className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
                    <div className="border-b border-[#d8e8f6]/[0.82] bg-white/[0.60] px-3.5 py-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#7a90a8]">
                        {group.label}
                    </div>
                    <div className="divide-y divide-[#d8e8f6]/[0.72]">
                        {group.items.map((item) => (
                            <CalendarRow
                                key={item.id}
                                item={item}
                                selected={item.id === selectedItemId}
                                onSelect={() => onSelect(item)}
                                onEdit={() => onEdit(item)}
                                onDone={() => onDone(item)}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function CalendarRow({
    item,
    selected,
    onSelect,
    onEdit,
    onDone,
}: {
    item: Unit19CalendarItem;
    selected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDone: () => void;
}) {
    const overdue = isOverdue(item);

    return (
        <div
            className={[
                "grid grid-cols-[28px_92px_minmax(0,1fr)_120px] items-start gap-3 px-3.5 py-2.5 transition-all duration-200 hover:bg-white/[0.55]",
                selected ? "bg-[#2f80ed]/[0.06]" : "",
                item.status === "done" ? "opacity-60" : "",
            ].join(" ")}
            onDoubleClick={(event) => {
                event.stopPropagation();
                onEdit();
            }}
        >
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onDone();
                }}
                className={[
                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-all duration-200 hover:scale-105 active:scale-95",
                    item.status === "done"
                        ? "border-[#20a76b] bg-[#20a76b] text-white"
                        : "border-[#ccd9e8] bg-white/[0.72] text-transparent hover:border-[#20a76b] hover:text-[#20a76b]",
                ].join(" ")}
                aria-label={item.status === "done" ? "Mark as open" : "Mark as done"}
            >
                ✓
            </button>
            <button type="button" onClick={onSelect} className="text-left">
                <div className="text-[12px] font-semibold text-[#0b1623]">{formatDay(parseLocalDate(item.date))}</div>
                <div className="mt-0.5 text-[10.5px] text-[#7a90a8]">{item.time || "Any time"}</div>
            </button>
            <button type="button" onClick={onSelect} className="min-w-0 text-left">
                <div className="truncate text-[13px] font-semibold leading-tight text-[#0b1623]">{item.title}</div>
                <div className="mt-0.5 max-h-8 overflow-hidden text-[11px] leading-4 text-[#7a90a8]">{item.note || item.location || "No notes"}</div>
                {item.linkedRecords?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {item.linkedRecords.slice(0, 2).map((record) => (
                            <span key={`${record.kind}-${record.label}`} className="rounded-full border border-[#ccd9e8] bg-white/[0.58] px-2 py-0.5 text-[9.5px] text-[#607993]">
                                {record.kind}: {record.label}
                            </span>
                        ))}
                    </div>
                ) : null}
            </button>
            <button type="button" onClick={onSelect} className="flex flex-col items-end gap-1 text-right">
                <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", typeClasses(item.type)].join(" ")}>{typeLabels[item.type]}</span>
                <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", statusClasses(item.status, overdue)].join(" ")}>{overdue ? "Overdue" : statusLabels[item.status]}</span>
            </button>
        </div>
    );
}

function WeekView({
    items,
    selectedDate,
    draggingItemId,
    onSelectDate,
    onSelectItem,
    onEditItem,
    onAddItem,
    onMoveItem,
    onDragStart,
    onDragEnd,
}: {
    items: Unit19CalendarItem[];
    selectedDate: string;
    draggingItemId: string | null;
    onSelectDate: (date: string) => void;
    onSelectItem: (item: Unit19CalendarItem) => void;
    onEditItem: (item: Unit19CalendarItem) => void;
    onAddItem: (date: string, time?: string) => void;
    onMoveItem: (itemId: string, date: string, targetItemId?: string, placement?: "before" | "after" | "end") => void;
    onDragStart: (item: Unit19CalendarItem, event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}) {
    const weekStart = startOfWeek(parseLocalDate(selectedDate));
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const weekNumber = getIsoWeekNumber(weekStart);
    const hours = Array.from({ length: 13 }, (_, index) => index + 8);

    function itemsForSlot(date: string, hour: number) {
        return sortCalendarItemsForDay(items.filter((item) => {
            if (item.date !== date || !item.time) return false;
            return Number(item.time.slice(0, 2)) === hour;
        }));
    }

    return (
        <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] p-3 shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onSelectDate(toIsoDate(addDays(weekStart, -7)))} className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86]">Previous</button>
                    <button type="button" onClick={() => onSelectDate(toIsoDate(new Date()))} className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">Today</button>
                </div>
                <div className="text-[13px] font-semibold text-[#0b1623]">Week {weekNumber} · {formatWeekRange(weekStart)}</div>
                <button type="button" onClick={() => onSelectDate(toIsoDate(addDays(weekStart, 7)))} className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86]">Next</button>
            </div>

            <div className="overflow-x-auto rounded-[16px] border border-[#d8e8f6]/[0.82] bg-white/[0.34]">
                <div className="min-w-[980px]">
                    <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-[#d8e8f6]/[0.82]">
                        <div className="border-r border-[#d8e8f6]/[0.82] bg-white/[0.48]" />
                        {days.map((day) => {
                            const dayIso = toIsoDate(day);
                            const selected = selectedDate === dayIso;
                            const today = isTodayDate(day);
                            return (
                                <button
                                    key={dayIso}
                                    type="button"
                                    onClick={() => onSelectDate(dayIso)}
                                    className={[
                                        "border-r border-[#d8e8f6]/[0.82] px-2 py-2 text-left transition last:border-r-0",
                                        selected ? "bg-[#2f80ed]/[0.10]" : today ? "bg-[#20a76b]/[0.10]" : isWeekend(day) ? "bg-[#cfa090]/[0.07]" : "bg-white/[0.44]",
                                    ].join(" ")}
                                >
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#7a90a8]">{weekDayLabels[(day.getDay() + 6) % 7]}</div>
                                    <div className={["mt-0.5 text-[15px] font-semibold", today ? "text-[#0f7448]" : "text-[#0b1623]"].join(" ")}>{day.getDate()}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-[#d8e8f6]/[0.82]">
                        <div className="border-r border-[#d8e8f6]/[0.82] bg-white/[0.48] px-2 py-2 text-[9.5px] font-semibold uppercase tracking-[0.10em] text-[#7a90a8]">All day</div>
                        {days.map((day) => {
                            const dayIso = toIsoDate(day);
                            const allDayItems = sortCalendarItemsForDay(items.filter((item) => item.date === dayIso && !item.time));
                            return (
                                <div key={dayIso} className="min-h-[46px] border-r border-[#d8e8f6]/[0.82] p-1.5 last:border-r-0" onDoubleClick={() => onAddItem(dayIso)}>
                                    <div className="space-y-1">
                                        {allDayItems.slice(0, 2).map((item) => (
                                            <CalendarSlotItem key={item.id} item={item} draggingItemId={draggingItemId} onSelectItem={onSelectItem} onEditItem={onEditItem} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hours.map((hour) => (
                        <div key={hour} className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-[#d8e8f6]/[0.72] last:border-b-0">
                            <div className="border-r border-[#d8e8f6]/[0.82] bg-white/[0.48] px-2 py-2 text-right text-[10px] font-semibold text-[#607993]">{String(hour).padStart(2, "0")}:00</div>
                            {days.map((day) => {
                                const dayIso = toIsoDate(day);
                                const slotItems = itemsForSlot(dayIso, hour);
                                const slotTime = `${String(hour).padStart(2, "0")}:00`;
                                return (
                                    <div
                                        key={`${dayIso}-${hour}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelectDate(dayIso)}
                                        onDoubleClick={() => onAddItem(dayIso, slotTime)}
                                        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                                        onDrop={(event) => { event.preventDefault(); const itemId = event.dataTransfer.getData("text/plain"); if (itemId) void onMoveItem(itemId, dayIso); }}
                                        className={[
                                            "min-h-[56px] border-r border-[#d8e8f6]/[0.82] p-1.5 transition last:border-r-0 hover:bg-[#2f80ed]/[0.045]",
                                            selectedDate === dayIso ? "bg-[#2f80ed]/[0.025]" : isWeekend(day) ? "bg-[#cfa090]/[0.025]" : "",
                                        ].join(" ")}
                                    >
                                        <div className="space-y-1">
                                            {slotItems.map((item) => (
                                                <CalendarSlotItem key={item.id} item={item} draggingItemId={draggingItemId} onSelectItem={onSelectItem} onEditItem={onEditItem} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CalendarSlotItem({
    item,
    draggingItemId,
    onSelectItem,
    onEditItem,
    onDragStart,
    onDragEnd,
}: {
    item: Unit19CalendarItem;
    draggingItemId: string | null;
    onSelectItem: (item: Unit19CalendarItem) => void;
    onEditItem: (item: Unit19CalendarItem) => void;
    onDragStart: (item: Unit19CalendarItem, event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            draggable
            onClick={(event) => { event.stopPropagation(); onSelectItem(item); }}
            onDoubleClick={(event) => { event.stopPropagation(); onEditItem(item); }}
            onDragStart={(event) => { event.stopPropagation(); onDragStart(item, event); }}
            onDragEnd={(event) => { event.stopPropagation(); onDragEnd(); }}
            onKeyDown={(event) => { if (event.key === "Enter") onSelectItem(item); }}
            className={[
                "cursor-grab rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
                draggingItemId === item.id ? "opacity-55 ring-2 ring-[#2f80ed]/[0.20]" : "",
                typeClasses(item.type),
            ].join(" ")}
        >
            <span className="block truncate">{item.time ? `${item.time} · ` : ""}{item.title}</span>
        </div>
    );
}

function MonthView({
    items,
    selectedDate,
    draggingItemId,
    onSelectDate,
    onSelectItem,
    onEditItem,
    onAddItem,
    onMoveItem,
    onDragStart,
    onDragEnd,
}: {
    items: Unit19CalendarItem[];
    selectedDate: string;
    draggingItemId: string | null;
    onSelectDate: (date: string) => void;
    onSelectItem: (item: Unit19CalendarItem) => void;
    onEditItem: (item: Unit19CalendarItem) => void;
    onAddItem: (date: string) => void;
    onMoveItem: (itemId: string, date: string, targetItemId?: string, placement?: "before" | "after" | "end") => void;
    onDragStart: (item: Unit19CalendarItem, event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}) {
    const monthStart = startOfMonth(parseLocalDate(selectedDate));
    const calendarStart = startOfWeek(monthStart);
    const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));

    return (
        <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] p-3 shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onSelectDate(toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)))} className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86]">
                        Previous
                    </button>
                    <button type="button" onClick={() => onSelectDate(toIsoDate(new Date()))} className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-1.5 text-[12px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">
                        Today
                    </button>
                </div>
                <div className="text-[14px] font-semibold text-[#0b1623]">{formatMonthTitle(monthStart)}</div>
                <button type="button" onClick={() => onSelectDate(toIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)))} className="rounded-xl border border-[#ccd9e8] bg-white/[0.58] px-3 py-1.5 text-[12px] font-semibold text-[#607993] transition hover:bg-white/[0.86]">
                    Next
                </button>
            </div>
            <div className="mb-1 grid gap-1.5 md:grid-cols-7">
                {weekDayLabels.map((label, index) => {
                    const weekend = index >= 5;

                    return (
                        <div
                            key={label}
                            className={[
                                "rounded-xl border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                weekend
                                    ? "border-[#cfa090]/[0.22] bg-[#cfa090]/[0.08] text-[#8c5947]"
                                    : "border-[#d8e8f6]/[0.82] bg-white/[0.50] text-[#7a90a8]",
                            ].join(" ")}
                        >
                            {label}
                        </div>
                    );
                })}
            </div>
            <div className="grid gap-1.5 md:grid-cols-7">
                {days.map((day) => {
                    const dayIso = toIsoDate(day);
                    const dayItems = sortCalendarItemsForDay(items.filter((item) => item.date === dayIso));
                    const inMonth = day >= monthStart && day <= endOfMonth(monthStart);
                    const selected = selectedDate === dayIso;
                    const weekend = isWeekend(day);
                    const today = isTodayDate(day);

                    return (
                        <div
                            key={dayIso}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectDate(dayIso)}
                            onDoubleClick={() => onAddItem(dayIso)}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const itemId = event.dataTransfer.getData("text/plain");
                                if (itemId) void onMoveItem(itemId, dayIso);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") onSelectDate(dayIso);
                            }}
                            className={[
                                "flex min-h-[92px] flex-col justify-start rounded-[14px] border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.76] active:scale-[0.99]",
                                selected
                                    ? "border-[#2f80ed]/[0.34] bg-[#2f80ed]/[0.07]"
                                    : today
                                        ? "border-[#20a76b]/[0.32] bg-[#20a76b]/[0.10] ring-2 ring-[#20a76b]/[0.16]"
                                        : weekend
                                            ? "border-[#cfa090]/[0.24] bg-[#cfa090]/[0.07]"
                                            : "border-[#d8e8f6]/[0.82] bg-white/[0.42]",
                                inMonth ? "" : "opacity-45",
                            ].join(" ")}
                        >
                            <div className="mb-1 flex items-start justify-between gap-2">
                                <span className={[
                                    "text-[11px] font-semibold",
                                    today ? "text-[#0f7448]" : weekend ? "text-[#8c5947]" : "text-[#0b1623]",
                                ].join(" ")}>{day.getDate()}</span>
                                {dayItems.length ? <span className="h-1.5 w-1.5 rounded-full bg-[#2f80ed]" /> : null}
                            </div>
                            <div className="space-y-0.5">
                                {dayItems.slice(0, 2).map((item) => (
                                    <div
                                        key={item.id}
                                        role="button"
                                        tabIndex={0}
                                        draggable
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectItem(item);
                                        }}
                                        onDoubleClick={(event) => {
                                            event.stopPropagation();
                                            onEditItem(item);
                                        }}
                                        onDragStart={(event) => {
                                            event.stopPropagation();
                                            onDragStart(item, event);
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            event.dataTransfer.dropEffect = "move";
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            const draggedItemId = event.dataTransfer.getData("text/plain");
                                            if (!draggedItemId || draggedItemId === item.id) return;

                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                                            void onMoveItem(draggedItemId, item.date, item.id, placement);
                                        }}
                                        onDragEnd={(event) => {
                                            event.stopPropagation();
                                            onDragEnd();
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") onSelectItem(item);
                                        }}
                                        className={[
                                            "truncate rounded-lg bg-white/[0.62] px-1.5 py-1 text-[9.5px] font-semibold text-[#4e6880] cursor-grab active:cursor-grabbing",
                                            draggingItemId === item.id ? "opacity-55 ring-2 ring-[#2f80ed]/[0.20]" : "",
                                        ].join(" ")}
                                    >
                                        {item.title}
                                    </div>
                                ))}
                                {dayItems.length > 2 ? <div className="text-[9px] text-[#7a90a8]">+{dayItems.length - 2} more</div> : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MiniDateNavigator({
    selectedDate,
    view,
    onSelectDate,
}: {
    selectedDate: string;
    view: CalendarView;
    onSelectDate: (date: string) => void;
}) {
    const selected = parseLocalDate(selectedDate);
    const monthStart = startOfMonth(selected);
    const calendarStart = startOfWeek(monthStart);
    const weekStart = startOfWeek(selected);
    const weekEnd = addDays(weekStart, 6);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, index) => currentYear - 5 + index);

    function moveMonth(offset: number) {
        const next = new Date(selected.getFullYear(), selected.getMonth() + offset, Math.min(selected.getDate(), 28));
        onSelectDate(toIsoDate(next));
    }

    function setMonth(month: number) {
        onSelectDate(toIsoDate(new Date(selected.getFullYear(), month, Math.min(selected.getDate(), 28))));
    }

    function setYear(year: number) {
        onSelectDate(toIsoDate(new Date(year, selected.getMonth(), Math.min(selected.getDate(), 28))));
    }

    return (
        <div className="mt-2.5 rounded-[16px] border border-white/[0.78] bg-white/[0.58] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
            <div className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#2060cc]">Date navigator</div>
            <div className="mb-2 grid grid-cols-[28px_minmax(96px,1fr)_66px_28px] items-center gap-1.5">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ccd9e8] bg-white/[0.58] text-[#607993] transition hover:bg-white/[0.88] hover:text-[#2060cc]">‹</button>
                <div className="relative min-w-0">
                    <select
                        value={selected.getMonth()}
                        onChange={(event) => setMonth(Number(event.target.value))}
                        className="h-7 w-full appearance-none rounded-lg border border-[#ccd9e8] bg-white/[0.72] pl-2.5 pr-8 text-[10.5px] font-semibold text-[#0b1623] outline-none focus:border-[#2f80ed]"
                    >
                        {monthLabels.map((label, index) => <option key={label} value={index}>{label}</option>)}
                    </select>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#607993]">
                        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="relative min-w-0">
                    <select
                        value={selected.getFullYear()}
                        onChange={(event) => setYear(Number(event.target.value))}
                        className="h-7 w-full appearance-none rounded-lg border border-[#ccd9e8] bg-white/[0.72] pl-2 pr-7 text-[10px] font-semibold text-[#0b1623] outline-none focus:border-[#2f80ed]"
                    >
                        {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#607993]">
                        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ccd9e8] bg-white/[0.58] text-[#607993] transition hover:bg-white/[0.88] hover:text-[#2060cc]">›</button>
            </div>
            <div className="grid grid-cols-[20px_repeat(7,minmax(0,1fr))] text-center">
                <div className="text-[8px] font-semibold text-[#9aaabd]">#</div>
                {weekDayLabels.map((label) => <div key={label} className="text-[8px] font-semibold uppercase text-[#7a90a8]">{label.slice(0, 1)}</div>)}
                {Array.from({ length: 6 }, (_, row) => {
                    const rowStart = addDays(calendarStart, row * 7);
                    return [
                        <div key={`week-${row}`} className="flex items-center justify-center text-[8px] text-[#9aaabd]">{getIsoWeekNumber(rowStart)}</div>,
                        ...Array.from({ length: 7 }, (_, column) => {
                            const day = addDays(rowStart, column);
                            const iso = toIsoDate(day);
                            const inMonth = day.getMonth() === selected.getMonth();
                            const selectedDay = iso === selectedDate;
                            const today = isTodayDate(day);
                            const inSelectedWeek = view === "week" && day >= weekStart && day <= weekEnd;
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    onClick={() => onSelectDate(iso)}
                                    className={[
                                        "mx-[1px] my-[1px] flex h-6 items-center justify-center rounded-md text-[9.5px] font-semibold transition",
                                        selectedDay ? "bg-[#2f80ed] text-white shadow-sm" : today ? "ring-1 ring-[#20a76b]/[0.55] text-[#0f7448]" : inSelectedWeek ? "bg-[#2f80ed]/[0.10] text-[#1560bc]" : "hover:bg-white/[0.82] text-[#334b66]",
                                        inMonth ? "" : "opacity-35",
                                    ].join(" ")}
                                >{day.getDate()}</button>
                            );
                        }),
                    ];
                }).flat()}
            </div>
            <button type="button" onClick={() => onSelectDate(toIsoDate(new Date()))} className="mt-2 w-full rounded-lg border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-2 py-1.5 text-[10.5px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">Jump to today</button>
        </div>
    );
}

function QuickItemDetails({
    item,
    onClose,
    onEdit,
    onDone,
}: {
    item: Unit19CalendarItem;
    onClose: () => void;
    onEdit: (item: Unit19CalendarItem) => void;
    onDone: (item: Unit19CalendarItem) => void;
}) {
    return (
        <div className="absolute inset-0 z-20">
            <button
                type="button"
                aria-label="Close item details"
                className="absolute inset-0 cursor-default bg-transparent"
                onClick={onClose}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
                <div className="pointer-events-auto relative z-10 w-full max-w-[560px] rounded-[18px] border border-white/[0.82] bg-white/[0.88] p-4 shadow-[0_24px_70px_rgba(6,16,29,0.24),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                            <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", typeClasses(item.type)].join(" ")}>{typeLabels[item.type]}</span>
                            <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", priorityClasses(item.priority)].join(" ")}>{priorityLabels[item.priority]}</span>
                            <span className={["rounded-full border px-2 py-0.5 text-[9.5px] font-semibold", statusClasses(item.status, isOverdue(item))].join(" ")}>{isOverdue(item) ? "Overdue" : statusLabels[item.status]}</span>
                        </div>
                        <h3 className="mt-2 truncate text-[16px] font-semibold text-[#0b1623]">{item.title}</h3>
                        <div className="mt-1 text-[11.5px] text-[#607993]">{formatDay(parseLocalDate(item.date))}{item.time ? ` · ${item.time}` : " · Any time"}</div>
                        {item.note ? <p className="mt-2 line-clamp-2 text-[11.5px] leading-4 text-[#4e6880]">{item.note}</p> : null}
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#ccd9e8] bg-white/[0.62] text-[#607993] transition hover:bg-white hover:text-[#2060cc]">×</button>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => onEdit(item)} className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] px-3 py-1.5 text-[11.5px] font-semibold text-[#4e6880] transition hover:border-[#2f80ed]/[0.32] hover:bg-white hover:text-[#2060cc]">Edit</button>
                    <button type="button" onClick={() => onDone(item)} className="rounded-xl border border-[#20a76b]/[0.24] bg-[#20a76b]/[0.08] px-3 py-1.5 text-[11.5px] font-semibold text-[#0f7448] transition hover:bg-[#20a76b]/[0.13]">{item.status === "done" ? "Reopen" : "Done"}</button>
                </div>
                </div>
            </div>
        </div>
    );
}

function CalendarEditor({
    item,
    saving,
    onChange,
    onSave,
    onCancel,
    onDelete,
}: {
    item: DraftCalendarItem;
    saving: boolean;
    onChange: (item: DraftCalendarItem) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06101d]/[0.18] p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[720px] rounded-[24px] border border-white/[0.78] bg-white/[0.88] p-4 shadow-[0_24px_90px_rgba(6,16,29,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#2060cc]">Calendar item</div>
                        <div className="mt-1 text-[20px] font-semibold text-[#0b1623]">Edit activity</div>
                    </div>
                    <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#ccd9e8] bg-white/[0.62] text-[#607993] transition hover:bg-white">
                        <IconClose />
                    </button>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Title</span>
                        <input value={item.title} onChange={(event) => onChange({ ...item, title: event.target.value })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]" />
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Date</span>
                        <AdminDatePicker value={item.date} onChange={(date) => onChange({ ...item, date })} />
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Time optional</span>
                        <input type="time" value={item.time ?? ""} onChange={(event) => onChange({ ...item, time: event.target.value })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]" />
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Type</span>
                        <select value={item.type} onChange={(event) => onChange({ ...item, type: event.target.value as Unit19CalendarItemType })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]">
                            {typeOrder.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
                        </select>
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Priority</span>
                        <select value={item.priority} onChange={(event) => onChange({ ...item, priority: event.target.value as Unit19CalendarItemPriority })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]">
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                        </select>
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Status</span>
                        <select value={item.status} onChange={(event) => onChange({ ...item, status: event.target.value as Unit19CalendarItemStatus })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]">
                            <option value="open">Open</option>
                            <option value="done">Done</option>
                            <option value="deferred">Deferred</option>
                        </select>
                    </label>

                    <label>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Location optional</span>
                        <input value={item.location ?? ""} onChange={(event) => onChange({ ...item, location: event.target.value })} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]" />
                    </label>

                    <label className="sm:col-span-2">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Notes</span>
                        <textarea value={item.note ?? ""} onChange={(event) => onChange({ ...item, note: event.target.value })} rows={3} className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none focus:border-[#2f80ed]" />
                    </label>

                    <label className="sm:col-span-2">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a90a8]">Related records optional</span>
                        <textarea
                            value={item.linkedText}
                            onChange={(event) => onChange({ ...item, linkedText: event.target.value })}
                            rows={3}
                            placeholder={"Task: Window grilles installation\nDocument: Cadastre Registration\nExpense: B-SAFE deposit €280"}
                            className="w-full rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-3 py-2 text-[13px] text-[#0b1623] outline-none placeholder:text-[#9ab0c4] focus:border-[#2f80ed]"
                        />
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap justify-between gap-2">
                    <button type="button" onClick={onDelete} className="rounded-xl border border-[#d96969]/[0.24] bg-[#d96969]/[0.07] px-3 py-2 text-[12px] font-semibold text-[#9d2f2f] transition hover:bg-[#d96969]/[0.12]">
                        Delete
                    </button>
                    <div className="flex gap-2">
                        <button type="button" onClick={onCancel} className="rounded-xl border border-[#ccd9e8] bg-white/[0.62] px-3 py-2 text-[12px] font-semibold text-[#607993] transition hover:bg-white">
                            Cancel
                        </button>
                        <button type="button" onClick={onSave} disabled={saving} className="rounded-xl border border-[#2f80ed]/[0.30] bg-[#2f80ed]/[0.10] px-3 py-2 text-[12px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.15] disabled:cursor-not-allowed disabled:opacity-60">
                            {saving ? "Saving..." : "Save item"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="rounded-[18px] border border-white/[0.78] bg-white/[0.58] px-4 py-10 text-center text-[13px] text-[#7a90a8] shadow-[0_14px_40px_rgba(41,73,112,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
            No visible calendar items. Adjust filters or add a new item.
        </div>
    );
}
