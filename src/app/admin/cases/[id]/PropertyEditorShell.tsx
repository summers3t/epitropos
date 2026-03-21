"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PropertyEditorShellProps = {
    action: (formData: FormData) => void | Promise<void>;
    caseId: string;
    propertyId: string;
    children: React.ReactNode;
};

export default function PropertyEditorShell({
    action,
    caseId,
    propertyId,
    children,
}: PropertyEditorShellProps) {
    const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const initialSnapshot = useMemo(() => {
        if (!formElement) return "";

        const formData = new FormData(formElement);
        const entries = Array.from(formData.entries())
            .filter(([key]) => key !== "property_id" && key !== "case_id")
            .map(([key, value]) => [key, String(value)])
            .sort(([a], [b]) => a.localeCompare(b));

        return JSON.stringify(entries);
    }, [formElement]);

    function computeSnapshot(form: HTMLFormElement) {
        const formData = new FormData(form);
        const entries = Array.from(formData.entries())
            .filter(([key]) => key !== "property_id" && key !== "case_id")
            .map(([key, value]) => [key, String(value)])
            .sort(([a], [b]) => a.localeCompare(b));

        return JSON.stringify(entries);
    }

    function handleInput() {
        if (!formElement) return;

        const currentSnapshot = computeSnapshot(formElement);
        setIsDirty(currentSnapshot !== initialSnapshot);
    }

    return (
        <form
            ref={setFormElement}
            action={action}
            onInput={handleInput}
            onChange={handleInput}
            className="space-y-6 border-t border-white/10 p-5"
        >
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="case_id" value={caseId} />

            {children}

            <div
                id={`property-actions-${propertyId}`}
                className="flex items-center justify-between gap-3"
            >
                <button
                    type="submit"
                    disabled={!isDirty}
                    className={
                        isDirty
                            ? "rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                            : "rounded-md border border-white/10 px-4 py-2 text-xs text-white/35 cursor-not-allowed"
                    }
                >
                    Save Evaluation
                </button>

                <Link
                    href={`/admin/cases/${caseId}?collapseProperty=${propertyId}#properties-list`}
                    className="rounded-md border border-white/15 px-4 py-2 text-xs hover:bg-white/5"
                >
                    Collapse
                </Link>
            </div>
        </form>
    );
}