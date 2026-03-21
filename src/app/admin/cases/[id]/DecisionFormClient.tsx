"use client";

import { useEffect, useRef } from "react";

type Props = {
    children: React.ReactNode;
};

export default function DecisionFormClient({ children }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const form = container.querySelector("form");
        if (!form) return;

        const statusSelectElement = form.querySelector(
            'select[name="decision_status"]'
        ) as HTMLSelectElement | null;

        const propertySelectElement = form.querySelector(
            'select[name="recommended_property_id"]'
        ) as HTMLSelectElement | null;

        if (!statusSelectElement || !propertySelectElement) return;

        const statusSelect = statusSelectElement;
        const propertySelect = propertySelectElement;

        function syncState() {
            const status = statusSelect.value;

            if (status === "rejected_all") {
                propertySelect.value = "";
                propertySelect.disabled = true;
            } else {
                propertySelect.disabled = false;
            }
        }

        syncState();

        statusSelect.addEventListener("change", syncState);

        return () => {
            statusSelect.removeEventListener("change", syncState);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}