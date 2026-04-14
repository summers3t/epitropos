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
    <div className="min-h-screen overflow-hidden bg-[#07101b] text-[#e8ecef]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,139,74,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,#08111d_0%,#0b1624_52%,#09111c_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1520px] px-4 py-8 md:px-8 md:py-10 xl:px-10">
        <div className="rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,20,32,0.78),rgba(8,15,25,0.7))] shadow-[0_35px_120px_rgba(0,0,0,0.46)] backdrop-blur-[28px]">
          <div className="border-b border-white/8 px-5 py-5 md:px-8 md:py-6 xl:px-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.30em] text-[#c8af74]">
                  {eyebrow}
                </p>
                <h1
                  className="max-w-[980px] text-3xl leading-[1.05] text-white md:text-4xl xl:text-[44px]"
                  style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}
                >
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-[860px] text-sm leading-7 text-white/58 md:text-[15px]">
                    {description}
                  </p>
                ) : null}
              </div>

              {headerContent ? (
                <div className="shrink-0 self-start lg:self-auto">{headerContent}</div>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] p-2 shadow-[0_16px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.countKey ? counts[item.countKey] : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition duration-300 ${active
                          ? "border-[#d6c08e]/28 bg-[rgba(166,139,74,0.16)] text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                          : "border-transparent bg-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
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