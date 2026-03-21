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

        const statusSelect = form.querySelector(
            'select[name="decision_status"]'
        ) as HTMLSelectElement | null;

        const propertySelects = Array.from(
            form.querySelectorAll('select[name="recommended_property_id"]')
        ) as HTMLSelectElement[];

        const helpItems = Array.from(
            form.querySelectorAll("[data-decision-help]")
        ) as HTMLElement[];

        const conditionalBlocks = Array.from(
            form.querySelectorAll("[data-decision-when]")
        ) as HTMLElement[];

        if (!statusSelect || propertySelects.length === 0) return;

        const decisionStatusSelect = statusSelect;

        function syncState() {
            const status = decisionStatusSelect.value;

            helpItems.forEach((item) => {
                const itemStatus = item.getAttribute("data-decision-help");
                item.classList.toggle("hidden", itemStatus !== status);
            });

            conditionalBlocks.forEach((block) => {
                const blockStatus = block.getAttribute("data-decision-when");
                const isActive = blockStatus === status;

                block.classList.toggle("hidden", !isActive);

                const blockSelect = block.querySelector(
                    'select[name="recommended_property_id"]'
                ) as HTMLSelectElement | null;

                if (!blockSelect) return;

                if (isActive) {
                    blockSelect.disabled = false;
                } else {
                    blockSelect.disabled = true;

                    if (status === "pending" || status === "rejected_all") {
                        blockSelect.value = "";
                    }
                }
            });
        }

        syncState();
        decisionStatusSelect.addEventListener("change", syncState);

        return () => {
            decisionStatusSelect.removeEventListener("change", syncState);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}