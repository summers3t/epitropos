import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function buildSafeFilename(title: string | null | undefined) {
  const base = (title || "report")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base || "report"}.pdf`;
}

function isMissingStorageObjectError(message: string | null | undefined) {
  const normalized = (message || "").toLowerCase();

  return (
    normalized.includes("not found") ||
    normalized.includes("no such object") ||
    normalized.includes("object not found")
  );
}

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, title, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 400 });
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  if (!report.storage_path) {
    return NextResponse.json(
      {
        error:
          "Report file is not attached. Ask the administrator to re-upload the report PDF.",
      },
      { status: 409 },
    );
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("reports")
    .download(report.storage_path);

  if (downloadError) {
    if (isMissingStorageObjectError(downloadError.message)) {
      return NextResponse.json(
        {
          error:
            "Report file is missing from storage. Ask the administrator to re-upload the report PDF.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: downloadError.message }, { status: 400 });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const filename = buildSafeFilename(report.title);

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
