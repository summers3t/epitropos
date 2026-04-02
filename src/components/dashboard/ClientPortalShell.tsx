"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

type ClientPortalShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  counts: ClientPortalCounts;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  countKey?: keyof ClientPortalCounts;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/screening", label: "Screenings", countKey: "screenings" },
  { href: "/dashboard/cases", label: "Cases", countKey: "cases" },
  { href: "/dashboard/offers", label: "Offers" },
  { href: "/dashboard/reports", label: "Reports", countKey: "reports" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
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

function NavIcon({ label }: { label: string }) {
  switch (label) {
    case "Dashboard":
      return (
        <svg
          className="h-[16px] w-[16px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "Screenings":
      return (
        <svg
          className="h-[16px] w-[16px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M8 3h8l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M16 3v5h5" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case "Cases":
      return (
        <svg
          className="h-[16px] w-[16px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "Offers":
      return (
        <svg
          className="h-[16px] w-[16px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "Reports":
      return (
        <svg
          className="h-[16px] w-[16px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    default:
      return null;
  }
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
    <div className="flex h-full w-full overflow-hidden bg-[#090b10] text-white">
      {/* ── LEFT SIDEBAR — static, never scrolls ── */}
      <aside className="flex w-[210px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0c0e14]">
        <nav className="flex-1 px-2 pt-5">
          <p className="mb-3 px-3 text-[9px] uppercase tracking-[0.35em] text-[#3a4050]">
            Client Portal
          </p>
          <div className="space-y-px">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const count = item.countKey ? counts[item.countKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center justify-between gap-2.5 rounded-sm px-3 py-2.5 text-[13px] transition-colors",
                    isActive
                      ? "bg-white/[0.07] text-white"
                      : "text-[#6a7282] hover:bg-white/[0.035] hover:text-[#b8bcc5]",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={isActive ? "text-[#d6b26b]" : "text-[#3a4050]"}
                    >
                      <NavIcon label={item.label} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {item.countKey ? <SidebarBadge count={count} /> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sign out */}
        <div className="border-t border-white/[0.07] px-5 py-4">
          <Link
            href="/auth/logout"
            className="flex items-center gap-2.5 text-[12px] text-[#3a4050] transition hover:text-[#6a7282]"
          >
            <svg
              className="h-[15px] w-[15px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* ── RIGHT MAIN PANE ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Static greeting — never scrolls */}
        <header className="shrink-0 border-b border-white/[0.07] px-10 py-5">
          <p className="text-[9px] uppercase tracking-[0.35em] text-[#3a4050]">
            {eyebrow}
          </p>
          <h1
            className="mt-1.5 text-[28px] leading-tight text-[#f0e6d3]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-[#5a6070]">
              {description}
            </p>
          ) : null}
        </header>

        {/* Scrollable content — only this region scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
