"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type AdminCounts = {
  screening: number;
  orders: number;
  cases: number;
};

const EMPTY_ADMIN_COUNTS: AdminCounts = {
  screening: 0,
  orders: 0,
  cases: 0,
};

const REFRESH_THROTTLE_MS = 1500;

type HeaderProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  initialAdminCounts?: AdminCounts;
};

function getInitials(displayName: string | null | undefined) {
  if (!displayName) return "?";

  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

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
    initialAdminCounts ?? EMPTY_ADMIN_COUNTS,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeRefreshKey = `${pathname}?${searchParams.toString()}`;
  const hasMountedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      setAdminCounts(EMPTY_ADMIN_COUNTS);
      hasMountedRef.current = false;
      isRefreshingRef.current = false;
      lastRefreshAtRef.current = 0;
      return;
    }

    let isCancelled = false;

    async function refreshAdminCounts(force = false) {
      const now = Date.now();

      if (!force && now - lastRefreshAtRef.current < REFRESH_THROTTLE_MS) {
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      lastRefreshAtRef.current = now;

      try {
        const response = await fetch("/api/header-counts", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as {
          screening?: number;
          orders?: number;
          cases?: number;
        };

        if (!isCancelled) {
          const nextCounts: AdminCounts = {
            screening: result.screening ?? 0,
            orders: result.orders ?? 0,
            cases: result.cases ?? 0,
          };

          setAdminCounts((currentCounts) => {
            if (
              currentCounts.screening === nextCounts.screening &&
              currentCounts.orders === nextCounts.orders &&
              currentCounts.cases === nextCounts.cases
            ) {
              return currentCounts;
            }

            return nextCounts;
          });
        }
      } catch {
        // ignore transient refresh failures
      } finally {
        isRefreshingRef.current = false;
      }
    }

    if (hasMountedRef.current) {
      refreshAdminCounts(true);
    } else {
      hasMountedRef.current = true;
    }

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
  }, [isLoggedIn, isAdmin, routeRefreshKey]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 border-b border-white/10 transition-all duration-300",
        scrolled
          ? "bg-[#070b12]/72 shadow-[0_10px_40px_rgba(0,0,0,0.20)] backdrop-blur-md"
          : "bg-[#070b12]/42 backdrop-blur-md",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex min-h-[60px] items-center justify-between gap-6">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label="Epitropos home"
          >
            <div className="flex items-center gap-3">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src="/logo_no_backgr.png"
                  alt="Epitropos"
                  width={120}
                  height={40}
                  priority
                  className="h-[54px] w-auto object-contain opacity-95 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
                />
              </div>

              <span
                className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/70"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                EPITROPOS
              </span>
            </div>
          </Link>

          <div className="flex min-w-0 items-center gap-6">
            <nav className="hidden items-center gap-8 text-[12px] uppercase tracking-[0.18em] text-white/62 md:flex">
              <Link href="/plans" className="transition hover:text-white">
                Plans
              </Link>
              <Link href="/how-it-works" className="transition hover:text-white">
                How it works
              </Link>
            </nav>

            <div className="ml-2 flex shrink-0 items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hidden text-[12px] uppercase tracking-[0.18em] text-white/62 transition hover:text-white md:inline-flex"
                  >
                    Dashboard
                  </Link>

                  <div className="flex max-w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={displayName || "User avatar"}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 rounded-full border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[11px] font-semibold text-white/85">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-xs font-medium whitespace-nowrap text-white/90">
                        {displayName || "Signed in"}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        {isAdmin ? "Admin" : "Client"}
                      </div>
                    </div>
                  </div>

                  <form action="/auth/logout" method="post">
                    <button className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/5 hover:text-white">
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/readiness-check"
                    className="inline-flex items-center rounded-md bg-stone px-5 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-navy transition hover:opacity-95"
                  >
                    Start Check
                  </Link>

                  <Link
                    href="/auth/login"
                    className="hidden text-[12px] uppercase tracking-[0.18em] text-white/62 transition hover:text-white md:inline-flex"
                  >
                    Sign in
                  </Link>
                </>
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
            >
              <span>Screening</span>
              <Badge count={adminCounts.screening} />
            </Link>

            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
            >
              <span>Orders</span>
              <Badge count={adminCounts.orders} />
            </Link>

            <Link
              href="/admin/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
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