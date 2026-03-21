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

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-screen bg-navy text-stone">
        <Header isLoggedIn={!!data.user} isAdmin={isAdmin} />

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