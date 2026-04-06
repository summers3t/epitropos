import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientPortalShell from "@/components/dashboard/ClientPortalShell";
import { getClientPortalCounts } from "@/lib/dashboard/getClientPortalCounts";

function formatClientCaseTitle(title: string | null | undefined) {
  if (!title) return "Client Case";

  return title.startsWith("Case for ")
    ? title.slice("Case for ".length)
    : title;
}

function formatClientReportTitle(title: string | null | undefined) {
  if (!title) return "Report";

  if (title.startsWith("Case for ") && title.endsWith(" Report")) {
    return `Report for ${title.slice("Case for ".length, -" Report".length)}`;
  }

  return title;
}

function formatClientDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function DashboardReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/reports");
  }

  const counts = await getClientPortalCounts(supabase, user.id);

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      `
      id,
      title,
      summary,
      storage_path,
      published,
      created_at,
      published_at,
      case_id,
      cases!inner (
        id,
        title,
        client_id
      )
      `,
    )
    .eq("published", true)
    .eq("cases.client_id", user.id)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <ClientPortalShell
      eyebrow="Client Portal"
      title="Reports"
      description="Published investment analysis reports."
      counts={counts}
    >
      <div className="space-y-6">
        {reports && reports.length > 0 ? (
          <section className="min-w-0">
            <div className="space-y-0">
              {reports.map((report) => {
                const caseTitle =
                  Array.isArray(report.cases) && report.cases.length > 0
                    ? report.cases[0]?.title
                    : (report.cases as { title?: string } | null)?.title;

                return (
                  <article
                    key={report.id}
                    className="border-b border-[#eadfca] px-2 py-4 transition duration-300 ease-out hover:bg-[#fffaf0] hover:shadow-[0_8px_20px_rgba(148,119,66,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a8660]">
                          Published Report
                        </p>

                        <p className="text-[14px] font-semibold text-[#0f1c2e]">
                          {formatClientReportTitle(report.title)}
                        </p>

                        <p className="text-[13px] text-[#6b7280]">
                          {formatClientCaseTitle(caseTitle)}
                        </p>

                        <p className="text-[13px] text-[#6b7280]">
                          Published{" "}
                          {report.published_at
                            ? formatClientDate(report.published_at)
                            : formatClientDate(report.created_at)}
                        </p>

                        <div className="max-w-3xl text-[13px] leading-relaxed text-[#6b7280]">
                          {report.summary || "No summary available yet."}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Link
                          href={`/dashboard/cases/${report.case_id}`}
                          className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                        >
                          Open Case
                        </Link>

                        {report.storage_path ? (
                          <a
                            href={`/api/reports/${report.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
                          >
                            Open Report
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="py-8">
            <p
              className="text-[28px] leading-none text-[#0f1c2e]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No published reports yet.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6b7280]">
              Published deliverables will appear here after your case work has
              been completed and a report is released.
            </p>

            <div className="mt-5">
              <Link
                href="/screening"
                className="inline-flex items-center border border-[#b8935c] px-5 py-2.5 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
              >
                Apply for Screening
              </Link>
            </div>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}
