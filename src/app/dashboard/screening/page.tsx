import { redirect } from "next/navigation";

export default async function DashboardScreeningRedirectPage() {
  redirect("/dashboard/analyses");
}