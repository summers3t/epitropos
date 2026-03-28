import type { Metadata } from "next";
import "./globals.css";
import { Inter, Montserrat } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import { getAdminHeaderCounts } from "@/lib/header/getAdminHeaderCounts";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Epitropos — Before Commitment",
  description:
    "Independent pre-deal investment risk analysis for Northern Greece.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let adminCounts = {
    screening: 0,
    orders: 0,
    cases: 0,
  };

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();

    isAdmin = profile?.role === "admin";

    displayName =
      profile?.full_name ||
      (typeof data.user.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name
        : null) ||
      (typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : null) ||
      data.user.email ||
      null;

    avatarUrl =
      typeof data.user.user_metadata?.avatar_url === "string"
        ? data.user.user_metadata.avatar_url
        : typeof data.user.user_metadata?.picture === "string"
          ? data.user.user_metadata.picture
          : null;

    if (isAdmin) {
      adminCounts = await getAdminHeaderCounts(supabase);
    }
  }

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="flex min-h-screen flex-col bg-navy text-stone">
        <Header
          isLoggedIn={!!data.user}
          isAdmin={isAdmin}
          displayName={displayName}
          avatarUrl={avatarUrl}
          initialAdminCounts={adminCounts}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-12 pt-36">
          {children}
        </main>

        <footer className="border-t border-white/10 py-10">
          <div className="mx-auto w-full max-w-[1440px] px-6 text-xs opacity-60">
            © {new Date().getFullYear()} Epitropos. Independent advisory — no
            brokerage, no commissions.
          </div>
        </footer>
      </body>
    </html>
  );
}
