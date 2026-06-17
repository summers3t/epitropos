"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TimedUndoInput<TAction extends string> = {
    action: TAction;
    label: string;
    restore: () => Promise<void>;
    commit?: () => Promise<void>;
};

type TimedUndoEntry<TAction extends string> = TimedUndoInput<TAction> & {
    id: number;
    expiresAt: number;
};

type UseTimedUndoStackOptions = {
    durationMs?: number;
    onError: (message: string) => void;
    commitErrorMessage: string;
    restoreErrorMessage: string;
};

export function useTimedUndoStack<TAction extends string>({
    durationMs = 5000,
    onError,
    commitErrorMessage,
    restoreErrorMessage,
}: UseTimedUndoStackOptions) {
    const [entries, setEntries] = useState<TimedUndoEntry<TAction>[]>([]);
    const [now, setNow] = useState(() => Date.now());
    const entriesRef = useRef<TimedUndoEntry<TAction>[]>([]);
    const sequenceRef = useRef(0);

    useEffect(() => {
        entriesRef.current = entries;
    }, [entries]);

    const publish = useCallback((nextEntries: TimedUndoEntry<TAction>[]) => {
        entriesRef.current = nextEntries;
        setEntries(nextEntries);
        setNow(Date.now());
    }, []);

    const finalizeEntries = useCallback(
        async (expiredEntries: TimedUndoEntry<TAction>[]) => {
            for (const entry of expiredEntries) {
                if (!entry.commit) continue;

                try {
                    await entry.commit();
                } catch (error) {
                    try {
                        await entry.restore();
                    } catch {
                        // Preserve the original commit error as the primary failure.
                    }
                    onError(error instanceof Error ? error.message : commitErrorMessage);
                }
            }
        },
        [commitErrorMessage, onError],
    );

    const queueUndo = useCallback(
        (input: TimedUndoInput<TAction>) => {
            const currentTime = Date.now();
            const expired = entriesRef.current.filter((entry) => entry.expiresAt <= currentTime);
            const active = entriesRef.current.filter((entry) => entry.expiresAt > currentTime);
            const nextEntry: TimedUndoEntry<TAction> = {
                ...input,
                id: ++sequenceRef.current,
                expiresAt: currentTime + durationMs,
            };

            publish([...active, nextEntry]);
            void finalizeEntries(expired);
        },
        [durationMs, finalizeEntries, publish],
    );

    const undoLatest = useCallback(async () => {
        const latest = entriesRef.current.at(-1);
        if (!latest) return;

        publish(entriesRef.current.slice(0, -1));

        try {
            await latest.restore();
        } catch (error) {
            onError(error instanceof Error ? error.message : restoreErrorMessage);
        }
    }, [onError, publish, restoreErrorMessage]);

    useEffect(() => {
        if (entries.length === 0) return;

        const earliestExpiry = Math.min(...entries.map((entry) => entry.expiresAt));
        const timeoutId = window.setTimeout(() => {
            const currentTime = Date.now();
            const expired = entriesRef.current.filter((entry) => entry.expiresAt <= currentTime);
            const active = entriesRef.current.filter((entry) => entry.expiresAt > currentTime);

            publish(active);
            void finalizeEntries(expired);
        }, Math.max(0, earliestExpiry - Date.now()));

        return () => window.clearTimeout(timeoutId);
    }, [entries, finalizeEntries, publish]);

    useEffect(() => {
        if (entries.length === 0) return;

        const intervalId = window.setInterval(() => setNow(Date.now()), 200);
        return () => window.clearInterval(intervalId);
    }, [entries.length]);

    useEffect(() => {
        return () => {
            const pendingEntries = entriesRef.current;
            entriesRef.current = [];
            for (const entry of pendingEntries) {
                if (entry.commit) void entry.commit();
            }
        };
    }, []);

    const current = entries.at(-1) ?? null;
    const remainingMs = current ? Math.max(0, current.expiresAt - now) : 0;
    const remainingPercent = current ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)) : 0;

    return useMemo(
        () => ({
            current,
            pendingCount: entries.length,
            remainingMs,
            remainingPercent,
            queueUndo,
            undoLatest,
        }),
        [current, entries.length, queueUndo, remainingMs, remainingPercent, undoLatest],
    );
}
