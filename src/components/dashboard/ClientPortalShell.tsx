"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

type ClientPortalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  counts: ClientPortalCounts;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  countKey?: keyof ClientPortalCounts;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
  },
  {
    href: "/dashboard/screening",
    label: "Screenings",
    countKey: "screenings",
  },
  {
    href: "/dashboard/cases",
    label: "Cases",
    countKey: "cases",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    countKey: "reports",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function ClientPortalShell({
  eyebrow,
  title,
  description,
  counts,
  children,
}: ClientPortalShellProps) {
  const pathname = usePathname();

  return (
    <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-32 xl:self-start">
        <div className="overflow-hidden rounded-[30px] border border-[#3c3126] bg-[#16110d] text-[#f1e4d4] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="border-b border-white/8 px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#c7b299]">
              Client Portal
            </p>

            <h2
              className="mt-4 text-3xl leading-none text-[#f7efe5]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Before
              <br />
              Commitment
            </h2>

            <p className="mt-4 text-sm leading-6 text-[#d4c0ab]/72">
              Follow your engagement clearly, step by step.
            </p>
          </div>

          <nav className="px-3 py-3">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const count = item.countKey ? counts[item.countKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center justify-between gap-3 rounded-[22px] px-4 py-3 transition",
                    isActive
                      ? "bg-[#f4eee4] text-[#1f1a14] shadow-[0_8px_28px_rgba(0,0,0,0.16)]"
                      : "text-[#e3d2be]/78 hover:bg-white/[0.05] hover:text-[#f7efe5]",
                  ].join(" ")}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.countKey ? <SidebarBadge count={count} /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/8 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#c7b299]/72">
              Advisory flow
            </p>
            <p className="mt-2 text-sm leading-6 text-[#d4c0ab]/68">
              Screening → Offer → Payment → Case → Report
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 overflow-hidden rounded-[34px] border border-[#d8cab8] bg-[#f4eee4] text-[#231d17] shadow-[0_28px_80px_rgba(0,0,0,0.18)]">
        <header className="border-b border-[#ddcfbe] px-6 py-8 md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#8f7d68]">
            {eyebrow}
          </p>

          <h1
            className="mt-4 text-5xl leading-none text-[#201a14] md:text-6xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#6e6255]">
            {description}
          </p>
        </header>

        <div className="px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </section>
  );
}
