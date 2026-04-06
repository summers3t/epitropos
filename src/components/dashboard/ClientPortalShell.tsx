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
  { href: "/dashboard/screening", label: "Screenings", countKey: "screenings" },
  { href: "/dashboard/cases", label: "Cases", countKey: "cases" },
  { href: "/dashboard/offers", label: "Offers" },
  { href: "/dashboard/payment", label: "Payments" },
  { href: "/dashboard/reports", label: "Reports", countKey: "reports" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#d97706] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavIcon({ label }: { label: string }) {
  switch (label) {
    case "Dashboard":
      return (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
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
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
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
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "Offers":
      return (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "Payments":
      return (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 9.5h19" />
          <path d="M7 15h3" />
        </svg>
      );
    case "Reports":
      return (
        <svg
          className="h-[17px] w-[17px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
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
  headerContent,
  children,
}: ClientPortalShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,#fbf7ef_0%,#f6efdf_100%)] text-[#1f2937]">
      <aside className="flex w-[272px] shrink-0 flex-col border-r border-[#d9c9a8]/70 bg-white/45 backdrop-blur-xl shadow-[10px_0_30px_rgba(148,119,66,0.08)]">
        <nav className="flex-1 px-3 pt-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const count = item.countKey ? counts[item.countKey] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[15px] transition-all duration-300 ease-out",
                    isActive
                      ? "bg-white/88 text-[#0f1c2e] shadow-[0_12px_30px_rgba(15,28,46,0.08)] ring-1 ring-[#dcc79e]/80"
                      : "text-[#6b7280] hover:bg-white/88 hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(15,28,46,0.08)] hover:-translate-y-[1px]",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={isActive ? "text-[#a16207]" : "text-[#8f7a56]"}
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

        <div className="border-t border-[#d9c9a8]/70 px-3 py-4">
          <Link
            href="/auth/logout"
            className="flex items-center justify-between rounded-xl px-4 py-3 text-[15px] text-[#6b7280] transition-all duration-300 ease-out hover:bg-white/88 hover:text-[#0f1c2e] hover:shadow-[0_10px_24px_rgba(15,28,46,0.08)] hover:-translate-y-[1px]"
          >
            <span className="font-medium">Sign Out</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-white/20 bg-[rgba(251,247,239,0.22)] supports-[backdrop-filter]:bg-[rgba(251,247,239,0.12)] backdrop-blur-2xl">
          <div className="px-6 py-2 lg:px-8 lg:py-2.5">
            {headerContent ? (
              headerContent
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a8660]">
                  {eyebrow}
                </p>

                <h1
                  className="mt-2 text-[32px] leading-none text-[#0f1c2e]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {title}
                </h1>

                {description ? (
                  <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#6b7280]">
                    {description}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 px-6 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
