import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ClientPortalCounts = {
  screenings: number;
  analyses: number;
  cases: number;
  reports: number;
};

export async function getClientPortalCounts(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<ClientPortalCounts> {
  const [
    { count: screeningsCount, error: screeningsCountError },
    { data: caseRows, error: caseRowsError },
  ] = await Promise.all([
    supabase
      .from("screening_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("cases").select("id").eq("client_id", userId),
  ]);

  if (screeningsCountError) {
    throw new Error(screeningsCountError.message);
  }

  if (caseRowsError) {
    throw new Error(caseRowsError.message);
  }

  const caseIds = (caseRows ?? []).map((item) => item.id);

  if (caseIds.length === 0) {
    return {
      screenings: screeningsCount ?? 0,
      analyses: screeningsCount ?? 0,
      cases: 0,
      reports: 0,
    };
  }

  const { count: reportsCount, error: reportsCountError } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .in("case_id", caseIds)
    .eq("published", true);

  if (reportsCountError) {
    throw new Error(reportsCountError.message);
  }

  return {
    screenings: screeningsCount ?? 0,
    analyses: screeningsCount ?? 0,
    cases: caseRows?.length ?? 0,
    reports: reportsCount ?? 0,
  };
}
