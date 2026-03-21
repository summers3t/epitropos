"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getHashParams() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export default function AuthConfirmPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = getHashParams();

      const error = params.get("error") || params.get("error_code");
      const errorDescription = params.get("error_description");
      if (error) {
        const msg = errorDescription ? decodeURIComponent(errorDescription) : error;
        if (!cancelled) setStatus(`Sign-in failed: ${msg}`);
        return;
      }

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        if (!cancelled) setStatus("No session tokens found in URL. Please retry sign-in.");
        return;
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (cancelled) return;

      if (setErr) {
        setStatus(`Sign-in failed: ${setErr.message}`);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-md rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Signing you in</h1>
        <p className="mt-3 text-sm opacity-70">{status}</p>
        {status.includes("failed") || status.includes("No session") ? (
          <a className="mt-4 inline-block text-sm underline opacity-80" href="/auth/login">
            Back to sign in
          </a>
        ) : null}
      </div>
    </main>
  );
}