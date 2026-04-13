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
    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.14em] text-white/70">
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
    <div className="min-h-screen bg-[#08111d] text-[#e8ecef]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(10,18,30,0.58)] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="border-b border-white/10 px-5 py-4 md:px-8 md:py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#a68b4a]">
                  {eyebrow}
                </p>
                <h1
                  className="text-3xl leading-tight text-white md:text-4xl"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-[820px] text-sm leading-7 text-white/62">
                    {description}
                  </p>
                ) : null}
              </div>

              {headerContent ? (
                <div className="shrink-0">{headerContent}</div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                const count = item.countKey ? counts[item.countKey] : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition duration-300 ${active
                      ? "border-[#d6c08e]/40 bg-[rgba(255,255,255,0.08)] text-white shadow-[0_8px_28px_rgba(0,0,0,0.18)]"
                      : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <span>{item.label}</span>
                    {count ? <CountBadge count={count} /> : null}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-6 md:px-8 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}