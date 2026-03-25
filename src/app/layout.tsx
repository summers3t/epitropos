import type { Metadata } from "next";
import "./globals.css";
import { Inter, Montserrat } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";

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
      const [
        { count: screeningCount, error: screeningCountError },
        { count: ordersCount, error: ordersCountError },
        { count: casesCount, error: casesCountError },
      ] = await Promise.all([
        supabase
          .from("screening_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "pending"),
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .in("status", ["active", "analysis"]),
      ]);

      if (screeningCountError) {
        throw new Error(screeningCountError.message);
      }

      if (ordersCountError) {
        throw new Error(ordersCountError.message);
      }

      if (casesCountError) {
        throw new Error(casesCountError.message);
      }

      adminCounts = {
        screening: screeningCount ?? 0,
        orders: ordersCount ?? 0,
        cases: casesCount ?? 0,
      };
    }
  }

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-screen bg-navy text-stone">
        <Header
          isLoggedIn={!!data.user}
          isAdmin={isAdmin}
          displayName={displayName}
          avatarUrl={avatarUrl}
          initialAdminCounts={adminCounts}
        />

        <main className="mx-auto max-w-6xl px-6 py-12">
          {children}
        </main>

        <footer className="border-t border-white/10 py-10">
          <div className="mx-auto max-w-6xl px-6 text-xs opacity-60">
            © {new Date().getFullYear()} Epitropos. Independent advisory — no brokerage, no commissions.
          </div>
        </footer>
      </body>
    </html>
  );
}