"use client";

import { useEffect } from "react";

const DECISION_RESTORE_KEY = "epitropos-admin-decision-restore";

type DecisionRestorePayload = {
    scrollY: number;
};

function readRestorePayload(): DecisionRestorePayload | null {
    const raw = window.sessionStorage.getItem(DECISION_RESTORE_KEY);

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<DecisionRestorePayload>;

        if (typeof parsed.scrollY !== "number" || Number.isNaN(parsed.scrollY)) {
            window.sessionStorage.removeItem(DECISION_RESTORE_KEY);
            return null;
        }

        return {
            scrollY: Math.max(0, parsed.scrollY),
        };
    } catch {
        window.sessionStorage.removeItem(DECISION_RESTORE_KEY);
        return null;
    }
}

export default function DecisionRestorePosition() {
    useEffect(() => {
        const payload = readRestorePayload();

        if (!payload) {
            return;
        }

        let frameId: number | null = null;
        let observer: ResizeObserver | null = null;

        const tryRestore = () => {
            const maxScroll =
                document.documentElement.scrollHeight - window.innerHeight;

            if (maxScroll < payload.scrollY) {
                return;
            }

            window.scrollTo({
                top: payload.scrollY,
                behavior: "auto",
            });

            window.sessionStorage.removeItem(DECISION_RESTORE_KEY);

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
    }, []);

    return null;
}