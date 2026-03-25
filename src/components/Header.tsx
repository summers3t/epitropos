"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AdminCounts = {
  screening: number;
  orders: number;
  cases: number;
};

type HeaderProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  initialAdminCounts?: AdminCounts;
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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Header({
  isLoggedIn,
  isAdmin,
  displayName,
  avatarUrl,
  initialAdminCounts,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [adminCounts, setAdminCounts] = useState<AdminCounts>(
    initialAdminCounts ?? { screening: 0, orders: 0, cases: 0 }
  );
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      return;
    }

    let isCancelled = false;

    async function refreshAdminCounts() {
      try {
        const response = await fetch("/api/header-counts", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as {
          screening: number;
          orders: number;
          cases: number;
        };

        if (!isCancelled) {
          setAdminCounts({
            screening: result.screening ?? 0,
            orders: result.orders ?? 0,
            cases: result.cases ?? 0,
          });
        }
      } catch {
        // ignore transient refresh failures
      }
    }

    refreshAdminCounts();

    const handleFocus = () => {
      refreshAdminCounts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAdminCounts();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoggedIn, isAdmin, pathname]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        "border-b border-white/10",
        scrolled ? "bg-navy/85 shadow-glass backdrop-blur" : "bg-navy/35 backdrop-blur",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-[0.18em] uppercase"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            EPITROPOS
          </Link>

          <div className="flex min-w-0 items-center gap-4">
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
            </nav>

            <div className="ml-4 flex shrink-0 items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
                  >
                    Dashboard
                  </Link>

                  <div className="flex max-w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
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

                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white/90 whitespace-nowrap">
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
          </div>
        </div>

        {isLoggedIn && isAdmin ? (
          <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              Admin workspace
            </span>

            <Link
              href="/admin/screening"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
            >
              <span>Screening</span>
              <Badge count={adminCounts.screening} />
            </Link>

            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
            >
              <span>Orders</span>
              <Badge count={adminCounts?.orders ?? 0} />
            </Link>

            <Link
              href="/admin/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 transition"
            >
              <span>Cases</span>
              <Badge count={adminCounts.cases} />
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}