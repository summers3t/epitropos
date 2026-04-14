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
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full border border-[#d5c2a5] bg-[#f6ecdc] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#7f6840]">
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

  return (
    <div className="min-h-screen overflow-hidden bg-[#efe7d8] text-[#2f3130]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,139,74,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(15,28,46,0.08),transparent_24%),linear-gradient(180deg,#f6f0e6_0%,#eee4d2_48%,#e9deca_100%)]" />
        <div className="client-portal-bg-image" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.46),rgba(255,248,239,0.34)_22%,rgba(239,231,216,0.76)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(180deg,rgba(255,255,255,0.42),transparent)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1520px] px-4 py-8 md:px-8 md:py-10 xl:px-10">
        <div className="client-glass-panel rounded-[36px]">
          <div className="border-b border-[#ddcfb7] px-5 py-5 md:px-8 md:py-6 xl:px-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.30em] text-[#9a7b48]">
                  {eyebrow}
                </p>
                <h1
                  className="max-w-[980px] text-3xl leading-[1.05] text-[#1e2a38] md:text-4xl xl:text-[44px]"
                  style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                >
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-[860px] text-sm leading-7 text-[#5f5b54] md:text-[15px]">
                    {description}
                  </p>
                ) : null}
              </div>

              {headerContent ? (
                <div className="shrink-0 self-start lg:self-auto">{headerContent}</div>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-[#dac9af] bg-[rgba(255,248,239,0.82)] p-2 shadow-[0_12px_34px_rgba(79,57,24,0.10)] backdrop-blur-md">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.countKey ? counts[item.countKey] : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                                            className={`client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] ${
                        active
                          ? "border-[#c9b18b] bg-[#0f1c2e] text-[#f6efdf] shadow-[0_12px_32px_rgba(15,28,46,0.18)]"
                          : "border-transparent bg-transparent text-[#6a6458] hover:border-[#d1c0a5] hover:bg-[rgba(255,248,239,0.78)] hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(79,57,24,0.08)]"
                      }`}
                    >
                      <span>{item.label}</span>
                      {count ? <CountBadge count={count} /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}