"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HeaderProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function getInitials(displayName: string | null | undefined) {
  if (!displayName) return "?";

  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function Header({
  isLoggedIn,
  isAdmin,
  displayName,
  avatarUrl,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        "border-b border-white/10",
        scrolled ? "bg-navy/85 shadow-glass backdrop-blur" : "bg-navy/35 backdrop-blur",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.18em] uppercase"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          EPITROPOS
        </Link>

        <nav className="flex items-center gap-4 text-sm opacity-90">
          <Link href="/methodology" className="hover:opacity-70">
            Methodology
          </Link>
          <Link href="/services" className="hover:opacity-70">
            Services
          </Link>
          <Link href="/cases" className="hover:opacity-70">
            Cases
          </Link>
          <Link href="/process" className="hover:opacity-70">
            Process
          </Link>
          <Link href="/pricing" className="hover:opacity-70">
            Pricing
          </Link>
          <Link href="/faq" className="hover:opacity-70">
            FAQ
          </Link>
          <Link href="/screening" className="hover:opacity-70">
            Screening
          </Link>

          <div className="ml-4 flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                >
                  Dashboard
                </Link>

                {isAdmin ? (
                  <>
                    <Link
                      href="/admin/screening"
                      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                    >
                      Screening
                    </Link>

                    <Link
                      href="/admin/orders"
                      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                    >
                      Orders
                    </Link>

                    <Link
                      href="/admin/cases"
                      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                    >
                      Cases
                    </Link>
                  </>
                ) : null}

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "User avatar"}
                      className="h-8 w-8 rounded-full border border-white/10 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[11px] font-semibold text-white/85">
                      {initials}
                    </div>
                  )}

                  <div className="max-w-[140px]">
                    <div className="truncate text-xs font-medium text-white/90">
                      {displayName || "Signed in"}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                      {isAdmin ? "Admin" : "Client"}
                    </div>
                  </div>
                </div>

                <form action="/auth/logout" method="post">
                  <button className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}