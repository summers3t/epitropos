"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirectPath(value: string | null) {
    if (!value) return "/dashboard";
    if (!value.startsWith("/")) return "/dashboard";
    if (value.startsWith("//")) return "/dashboard";
    return value;
}

export default function LoginPage() {
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const oauthRedirectTo = `${siteUrl}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;

    async function signInWithGoogle() {
        setBusy(true);
        setStatus(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: oauthRedirectTo },
        });

        setBusy(false);

        if (error) {
            setStatus(error.message);
        }
    }

    return (
        <main className="min-h-screen px-6 py-16">
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white/5 p-6 backdrop-blur">
                <h1 className="text-2xl font-semibold">Sign in</h1>
                <p className="mt-2 text-sm opacity-70">
                    Sign in to continue your screening application or access your client area.
                </p>

                <button
                    onClick={signInWithGoogle}
                    disabled={busy}
                    className="mt-6 w-full rounded-xl border px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
                >
                    Sign in with Google
                </button>

                <p className="mt-4 text-xs opacity-55">
                    Email sign-in is not active yet.
                </p>

                {status && (
                    <div className="mt-4 rounded-xl border p-3 text-sm opacity-80">
                        {status}
                    </div>
                )}
            </div>
        </main>
    );
}