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
  href?: string;
  label: string;
  countKey?: keyof ClientPortalCounts;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
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
    label: "Offers",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    countKey: "reports",
  },
];

function isActivePath(pathname: string, href?: string) {
  if (!href) return pathname.startsWith("/dashboard/offers");

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

function NavIcon({ label }: { label: string }) {
  switch (label) {
    case "Dashboard":
      return (
        <svg
          className="h-[18px] w-[18px]"
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
          className="h-[18px] w-[18px]"
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
          className="h-[18px] w-[18px]"
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
          className="h-[18px] w-[18px]"
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
          className="h-[18px] w-[18px]"
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
    <section className="h-[calc(100vh-5.5rem)] overflow-hidden rounded-[26px] border border-white/10 bg-[#090b10] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] xl:grid xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex h-full flex-col border-r border-white/10 bg-[#0b0d12]">
        <nav className="px-3 py-5">
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const count = item.countKey ? counts[item.countKey] : 0;

              const sharedClassName = [
                "flex items-center justify-between gap-3 rounded-none border border-transparent px-4 py-4 text-[15px] transition",
                isActive
                  ? "bg-white/[0.06] text-white"
                  : "text-[#b8bcc5] hover:bg-white/[0.035] hover:text-white",
              ].join(" ");

              const content = (
                <>
                  <span className="flex items-center gap-3">
                    <span className="text-[#8f95a2]">
                      <NavIcon label={item.label} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </span>

                  {item.countKey ? <SidebarBadge count={count} /> : null}
                </>
              );

              if (!item.href) {
                return (
                  <div key={item.label} className={sharedClassName}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={sharedClassName}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto border-t border-white/10 px-6 py-6">
          <Link
            href="/auth/logout"
            className="flex items-center gap-3 text-[15px] text-[#b8bcc5] transition hover:text-white"
          >
            <svg
              className="h-[18px] w-[18px]"
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

      <div className="flex h-full min-w-0 flex-col bg-[#090b10]">
        <header className="shrink-0 px-8 pb-6 pt-8 md:px-10 md:pb-7 md:pt-9 xl:px-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#9aa0ad]">
            {eyebrow}
          </p>

          <h1
            className="mt-5 text-4xl leading-none text-[#f3e7d8] md:text-5xl"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            {title}
          </h1>

          {description ? (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#8f95a2]">
              {description}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 md:px-8 md:pb-12 xl:px-10">
          {children}
        </div>
      </div>
    </section>
  );
}
