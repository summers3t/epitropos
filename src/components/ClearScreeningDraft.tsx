"use client";

import { useEffect } from "react";

const DRAFT_KEY = "epitropos:screeningDraft:v1";

export default function ClearScreeningDraft({ when }: { when: boolean }) {
    useEffect(() => {
        if (!when) return;
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch { }
    }, [when]);

    return null;
}