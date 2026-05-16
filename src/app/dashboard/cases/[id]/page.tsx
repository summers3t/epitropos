import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardCaseDetailRedirectPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/dashboard/cases/${id}`);
  }

  const { data: caseItem, error } = await supabase
    .from("cases")
    .select("id, screening_request_id")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!caseItem || !caseItem.screening_request_id) {
    notFound();
  }

  redirect(`/dashboard/analyses/${caseItem.screening_request_id}`);
}