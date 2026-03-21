"use client";

import { useEffect, useRef, useState } from "react";

const REPORTS_OPEN_KEY = "epitropos-admin-reports-open";
const REPORT_RESTORE_KEY = "epitropos-admin-reports-restore";

type ReportRestorePayload = {
    scrollY: number;
};

function readRestorePayload(): ReportRestorePayload | null {
    const raw = window.sessionStorage.getItem(REPORT_RESTORE_KEY);

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<ReportRestorePayload>;

        if (typeof parsed.scrollY !== "number" || Number.isNaN(parsed.scrollY)) {
            window.sessionStorage.removeItem(REPORT_RESTORE_KEY);
            return null;
        }

        return {
            scrollY: Math.max(0, parsed.scrollY),
        };
    } catch {
        window.sessionStorage.removeItem(REPORT_RESTORE_KEY);
        return null;
    }
}

export default function ReportsSection({
    children,
    reportCount,
}: {
    children: React.ReactNode;
    reportCount: number;
}) {
    const [open, setOpen] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.sessionStorage.getItem(REPORTS_OPEN_KEY) === "true";
    });

    const containerRef = useRef<HTMLDivElement | null>(null);
    const restoredOnceRef = useRef(false);

    function toggle() {
        setOpen((prev) => {
            const next = !prev;
            window.sessionStorage.setItem(REPORTS_OPEN_KEY, String(next));
            return next;
        });
    }

    useEffect(() => {
        window.sessionStorage.setItem(REPORTS_OPEN_KEY, String(open));
    }, [open]);

    useEffect(() => {
        if (!open || restoredOnceRef.current) {
            return;
        }

        const payload = readRestorePayload();

        if (!payload) {
            return;
        }

        let frameId: number | null = null;
        let observer: ResizeObserver | null = null;

        const tryRestore = () => {
            const container = containerRef.current;

            if (!container) {
                return;
            }

            const maxScroll =
                document.documentElement.scrollHeight - window.innerHeight;

            if (maxScroll < payload.scrollY) {
                return;
            }

            window.scrollTo({
                top: payload.scrollY,
                behavior: "auto",
            });

            restoredOnceRef.current = true;
            window.sessionStorage.removeItem(REPORT_RESTORE_KEY);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }
        };

        frameId = window.requestAnimationFrame(tryRestore);

        observer = new ResizeObserver(() => {
            tryRestore();
        });

        observer.observe(document.body);

        return () => {
            if (observer) {
                observer.disconnect();
            }

            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [open, reportCount]);

    return (
        <div
            ref={containerRef}
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur"
        >
            <div
                onClick={toggle}
                className="flex cursor-pointer items-center justify-between gap-3 p-6"
            >
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Reports
                    </h2>
                    <p className="mt-1 text-xs text-white/55">
                        {reportCount} {reportCount === 1 ? "report" : "reports"}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        toggle();
                    }}
                    className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70"
                >
                    {open ? "Collapse" : "Expand"}
                </button>
            </div>

            {open ? (
                <div className="border-t border-white/10 p-6 pt-4">
                    {children}
                </div>
            ) : null}
        </div>
    );
}