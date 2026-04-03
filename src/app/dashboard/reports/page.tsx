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
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <p className="text-[9px] uppercase tracking-[0.35em] text-[#3a4050]">
                Published Reports
              </p>

              <span className="border border-white/[0.07] px-2.5 py-0.5 text-[11px] text-[#4a5060]">
                {reports.length}
              </span>
            </div>

            <div className="space-y-0">
              {reports.map((report) => {
                const caseTitle =
                  Array.isArray(report.cases) && report.cases.length > 0
                    ? report.cases[0]?.title
                    : (report.cases as { title?: string } | null)?.title;

                return (
                  <article
                    key={report.id}
                    className="border-b border-white/[0.07] px-2 py-5 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <p className="text-[14px] font-semibold text-[#f0e6d3]">
                          {formatClientReportTitle(report.title)}
                        </p>

                        <p className="text-[13px] text-[#6a7080]">
                          {formatClientCaseTitle(caseTitle)}
                        </p>

                        <p className="text-[13px] text-[#6a7080]">
                          Published{" "}
                          {report.published_at
                            ? formatClientDate(report.published_at)
                            : formatClientDate(report.created_at)}
                        </p>

                        <div className="max-w-3xl text-[13px] leading-relaxed text-[#9aa0ad]">
                          {report.summary || "No summary available yet."}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Link
                          href={`/dashboard/cases/${report.case_id}`}
                          className="inline-flex items-center border border-white/[0.07] px-4 py-2 text-sm text-[#c9cdd5] transition hover:bg-white/[0.04] hover:text-white"
                        >
                          Open Case
                        </Link>

                        {report.storage_path ? (
                          <a
                            href={`/api/reports/${report.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center border border-[#b8935c] px-4 py-2 text-sm text-[#d6b26b] transition hover:bg-[#b8935c]/10"
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
          <section className="border border-white/[0.07] px-6 py-8">
            <p
              className="text-2xl leading-none text-[#f0e6d3]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No published reports yet.
            </p>

            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[#5a6070]">
              Published deliverables will appear here after your case work has
              been completed and a report is released.
            </p>
          </section>
        )}
      </div>
    </ClientPortalShell>
  );
}
