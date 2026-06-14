"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AdminDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
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

function formatDisplayDate(value: string) {
  if (!value) return "Select date";
  const date = parseLocalDate(value);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function isSameDay(a: Date, b: Date) {
  return toIsoDate(a) === toIsoDate(b);
}

export default function AdminDatePicker({
  value,
  onChange,
  className,
}: AdminDatePickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = value ? parseLocalDate(value) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate),
  );
  const [popoverPosition, setPopoverPosition] = useState({
    left: 0,
    top: 0,
    maxHeight: 388,
  });

  function updatePopoverPosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;

    const popoverWidth = 286;
    const preferredHeight = 388;
    const viewportPadding = 12;
    const availableBelow =
      window.innerHeight - rect.bottom - viewportPadding - 6;
    const availableAbove = rect.top - viewportPadding - 6;
    const openBelow =
      availableBelow >= Math.min(preferredHeight, availableAbove);
    const availableHeight = Math.max(
      240,
      openBelow ? availableBelow : availableAbove,
    );
    const maxHeight = Math.min(preferredHeight, availableHeight);

    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - popoverWidth - viewportPadding,
    );

    const top = openBelow
      ? Math.min(
          rect.bottom + 6,
          window.innerHeight - maxHeight - viewportPadding,
        )
      : Math.max(viewportPadding, rect.top - maxHeight - 6);

    setPopoverPosition({ left, top, maxHeight });
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(updatePopoverPosition);

    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open]);

  const days = useMemo(() => {
    const calendarStart = startOfWeek(startOfMonth(visibleMonth));
    return Array.from({ length: 42 }, (_, index) =>
      addDays(calendarStart, index),
    );
  }, [visibleMonth]);

  function selectDate(date: Date) {
    onChange(toIsoDate(date));
    setVisibleMonth(startOfMonth(date));
    setOpen(false);
  }

  const popover = open ? (
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-[286px] overflow-y-auto rounded-[18px] border border-[#ccd9e8] bg-white/[0.98] p-3 shadow-[0_22px_70px_rgba(6,16,29,0.20)] backdrop-blur-2xl"
      style={{
        left: popoverPosition.left,
        top: popoverPosition.top,
        maxHeight: popoverPosition.maxHeight,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() - 1,
                1,
              ),
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#ccd9e8] bg-white/[0.70] text-[#607993] transition hover:bg-white"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-[13px] font-semibold text-[#0b1623]">
          {formatMonthTitle(visibleMonth)}
        </div>
        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() + 1,
                1,
              ),
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#ccd9e8] bg-white/[0.70] text-[#607993] transition hover:bg-white"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a90a8]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayIso = toIsoDate(day);
          const selected = value === dayIso;
          const today = isSameDay(day, new Date());
          const inMonth =
            day >= startOfMonth(visibleMonth) &&
            day <= endOfMonth(visibleMonth);

          return (
            <button
              key={dayIso}
              type="button"
              onClick={() => selectDate(day)}
              className={[
                "flex h-8 items-center justify-center rounded-xl text-[12px] font-semibold transition-all duration-150 active:scale-[0.96]",
                selected
                  ? "bg-[#2f80ed] text-white shadow-[0_8px_20px_rgba(47,128,237,0.24)]"
                  : today
                    ? "border border-[#2f80ed]/[0.28] bg-[#2f80ed]/[0.07] text-[#1560bc]"
                    : "border border-transparent text-[#0b1623] hover:border-[#ccd9e8] hover:bg-[#edf3fa]",
                inMonth ? "" : "opacity-38",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#d8e8f6] pt-2">
        <button
          type="button"
          onClick={() => selectDate(new Date())}
          className="rounded-xl border border-[#2f80ed]/[0.24] bg-[#2f80ed]/[0.08] px-3 py-1.5 text-[11px] font-semibold text-[#1560bc] transition hover:bg-[#2f80ed]/[0.13]"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-[#ccd9e8] bg-white/[0.70] px-3 py-1.5 text-[11px] font-semibold text-[#607993] transition hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const nextOpen = !open;

          if (nextOpen) {
            setVisibleMonth(
              startOfMonth(value ? parseLocalDate(value) : new Date()),
            );
          }

          setOpen(nextOpen);
        }}
        className={[
          "flex w-full min-w-0 items-center rounded-xl border border-[#ccd9e8] bg-white/[0.82] px-2.5 py-2 text-left text-[12px] text-[#0b1623] outline-none transition focus:border-[#2f80ed] focus:ring-2 focus:ring-[#2f80ed]/[0.12]",
          className ?? "",
        ].join(" ")}
      >
        <span className="block min-w-0 truncate whitespace-nowrap">{formatDisplayDate(value)}</span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
}
