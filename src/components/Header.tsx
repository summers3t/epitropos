"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HeaderProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export default function Header({ isLoggedIn, isAdmin }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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