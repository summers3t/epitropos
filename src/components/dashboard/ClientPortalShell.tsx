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
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full border border-[#d5c2a5] bg-[#f8efe2] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#6b5633]">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,139,74,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(15,28,46,0.12),transparent_24%),linear-gradient(180deg,#f6f0e6_0%,#eee4d2_48%,#e9deca_100%)]" />
        <div className="client-portal-bg-image" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,248,239,0.14)_18%,rgba(239,231,216,0.58)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1520px] px-4 py-8 md:px-8 md:py-10 xl:px-10">
        <div className="client-glass-panel rounded-[36px]">
          <div className="border-b border-[#d7c5ac]/60 bg-[linear-gradient(180deg,rgba(8,20,38,0.96),rgba(16,34,58,0.92))] px-5 py-5 md:px-8 md:py-6 xl:px-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.30em] text-[#d3bb8a]">
                  {eyebrow}
                </p>
                <h1
                  className="max-w-[980px] text-3xl leading-[1.05] text-[#f6efdf] md:text-4xl xl:text-[44px]"
                  style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                >
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-[860px] text-sm leading-7 text-[#d4d9df] md:text-[15px]">
                    {description}
                  </p>
                ) : null}
              </div>

              {headerContent ? (
                <div className="shrink-0 self-start lg:self-auto">{headerContent}</div>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] p-2 shadow-[0_14px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.countKey ? counts[item.countKey] : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`client-interactive client-focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] ${active
                          ? "border-[#d1bb8c] bg-[#f4ead8] text-[#0f1c2e] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                          : "border-transparent bg-transparent text-[#e0e5ea] hover:border-white/14 hover:bg-white/[0.10] hover:text-white hover:shadow-[0_10px_24px_rgba(0,0,0,0.10)] active:bg-white/[0.14]"
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