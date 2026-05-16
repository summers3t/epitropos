import { redirect } from "next/navigation";

export default async function ScreeningRedirectPage() {
  redirect("/readiness-check");
}