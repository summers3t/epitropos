import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScreeningForm from "./ScreeningForm";

async function submitScreening(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/auth/login?redirect=/screening");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const budget_range = String(formData.get("budget_range") ?? "").trim() || null;
  const financing_type = String(formData.get("financing_type") ?? "").trim() || null;
  const goal = String(formData.get("goal") ?? "").trim() || null;
  const listing_url = String(formData.get("listing_url") ?? "").trim() || null;
  const plan_interest = String(formData.get("plan_interest") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const property_identified =
    String(formData.get("property_identified") ?? "").trim() === "yes";

  if (!name || !email) {
    throw new Error("Name and email are required.");
  }

  const { error } = await supabase.from("screening_requests").insert({
    user_id: auth.user.id,
    name,
    email,
    budget_range,
    financing_type,
    goal,
    property_identified,
    listing_url,
    plan_interest,
    notes,
    status: "new",
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard?screening_created=1");
}

export default async function ScreeningPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isLoggedIn = !!auth.user;

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-semibold">Screening Application</h1>

      <p className="mt-4 opacity-80">
        Short application for buyers considering property in Northern Greece.
        If there is a fit, we schedule a screening call.
      </p>

      <ScreeningForm isLoggedIn={isLoggedIn} action={submitScreening} />

      <p className="mt-4 text-xs opacity-60">
        Independent advisory only. No brokerage. No commissions. Screening is
        required before any engagement.
      </p>
    </section>
  );
}