"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

type ClientPortalShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  counts: ClientPortalCounts;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  countKey?: keyof ClientPortalCounts;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/analyses", label: "My Analyses", countKey: "analyses" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountBadge({ count }: { count: number }) {
  if (!count) return null;

  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full border border-[#d5c2a5]/60 bg-[#f8efe2]/80 px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-[#6b5633]">
      {count}
    </span>
  );
}

export default function ClientPortalShell({
  eyebrow,
  title,
  description,
  counts,
  headerContent,
  children,
}: ClientPortalShellProps) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f0e8d8] text-[#2f3130]">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,139,74,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(15,28,46,0.06),transparent_25%),linear-gradient(180deg,#f8f4ec_0%,#f0e8d8_48%,#ebe3d3_100%)]" />
        <div className="client-portal-bg-image" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,248,239,0.08)_18%,rgba(239,231,216,0.4)_100%)]" />
      </div>

      {/* Content container */}
      <div className="relative mx-auto w-full max-w-[1920px]">
        {isDashboardHome ? (
          /* Dashboard Home: Full-bleed premium layout */
          <div className="dashboard-frame px-4 py-6 md:px-6 md:py-8 xl:px-8 xl:py-10">
            {/* Minimal top navigation bar for dashboard home */}
            <nav className="mb-8 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#8f7443]">
                  {eyebrow}
                </span>
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-[#d7c6ab]/50 bg-[rgba(255,255,255,0.4)] p-1 backdrop-blur-xl shadow-[0_8px_24px_rgba(79,57,24,0.06)]">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.countKey ? counts[item.countKey] : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                        active
                          ? "border border-[#d1bb8c] bg-[#f4ead8] text-[#0f1c2e] shadow-[0_4px_12px_rgba(201,177,139,0.2)]"
                          : "border border-transparent text-[#5c564e] hover:border-[#d7c6ab]/60 hover:bg-white/40 hover:text-[#2f3130]"
                      }`}
                    >
                      <span>{item.label}</span>
                      {count ? <CountBadge count={count} /> : null}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {children}
          </div>
        ) : (
          /* Other pages: Glass panel with dark header */
          <div className="client-glass-panel overflow-hidden rounded-[28px] mx-3 my-4 md:mx-5 md:my-6 xl:mx-6">
            <div className="border-b border-[#d7c5ac]/25 bg-[linear-gradient(180deg,rgba(8,20,38,0.95),rgba(14,31,54,0.92))] px-5 py-4 md:px-7 md:py-5 xl:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#d3bb8a]">
                    {eyebrow}
                  </p>
                  <h1 className="font-display max-w-[980px] text-[32px] leading-[1.05] text-[#f6efdf] md:text-[42px] xl:text-[50px]">
                    {title}
                  </h1>
                  {description ? (
                    <p className="max-w-[800px] text-[14px] leading-7 text-[#d4d9df]/80">
                      {description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                    {navItems.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      const count = item.countKey ? counts[item.countKey] : 0;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                            active
                              ? "border-[#d1bb8c] bg-[#f4ead8] text-[#0f1c2e] shadow-[0_4px_12px_rgba(201,177,139,0.2)]"
                              : "border-transparent bg-transparent text-[#e0e5ea]/80 hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          {count ? <CountBadge count={count} /> : null}
                        </Link>
                      );
                    })}
                  </div>

                  {headerContent ? (
                    <div className="shrink-0">{headerContent}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-4 py-5 md:px-6 md:py-6 xl:px-8">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}