import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getReportsStoragePathFromPublicUrl(
  fileUrl: string | null | undefined,
) {
  if (!fileUrl) {
    return null;
  }

  const marker = "/storage/v1/object/public/reports/";
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const rawPath = fileUrl.slice(markerIndex + marker.length);

  if (!rawPath) {
    return null;
  }

  return decodeURIComponent(rawPath);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();

  const file = formData.get("file");
  const caseId = String(formData.get("case_id") ?? "").trim();
  const reportId = String(formData.get("report_id") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A report file is required." },
      { status: 400 },
    );
  }

  if (!caseId || !reportId) {
    return NextResponse.json(
      { error: "Missing case_id or report_id." },
      { status: 400 },
    );
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, case_id, published, storage_path, file_url")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 400 });
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id, status")
    .eq("id", report.case_id)
    .maybeSingle();

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 400 });
  }

  if (!caseRow) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  if (caseRow.status === "closed") {
    return NextResponse.json(
      { error: "Closed cases cannot be modified." },
      { status: 400 },
    );
  }

  if (report.case_id !== caseId) {
    return NextResponse.json(
      { error: "Report does not belong to the provided case." },
      { status: 400 },
    );
  }

  if (report.published) {
    return NextResponse.json(
      { error: "Published reports are locked. Unpublish first." },
      { status: 400 },
    );
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : "";

  if (extension !== "pdf") {
    return NextResponse.json(
      { error: "Only PDF uploads are allowed." },
      { status: 400 },
    );
  }

  const sanitizedName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp = Date.now();

  const previousStoragePath =
    report.storage_path || getReportsStoragePathFromPublicUrl(report.file_url);

  const storagePath = `case-${caseId}/report-${reportId}/${timestamp}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      storage_path: storagePath,
      file_url: null,
    })
    .eq("id", report.id);

  if (updateError) {
    await supabase.storage.from("reports").remove([storagePath]);

    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (previousStoragePath && previousStoragePath !== storagePath) {
    const { error: removeError } = await supabase.storage
      .from("reports")
      .remove([previousStoragePath]);

    if (removeError) {
      return NextResponse.json(
        {
          error:
            "New report file was saved, but the previous file could not be removed. Manual cleanup may be required.",
        },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    storage_path: storagePath,
    file_name: file.name,
  });
}
