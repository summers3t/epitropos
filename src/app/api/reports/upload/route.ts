import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
            { status: 400 }
        );
    }

    if (!caseId || !reportId) {
        return NextResponse.json(
            { error: "Missing case_id or report_id." },
            { status: 400 }
        );
    }

    const extension =
        file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "";

    if (extension !== "pdf") {
        return NextResponse.json(
            { error: "Only PDF uploads are allowed." },
            { status: 400 }
        );
    }

    const sanitizedName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    const timestamp = Date.now();

    const storagePath = `case-${caseId}/report-${reportId}/${timestamp}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
        });

    if (uploadError) {
        return NextResponse.json(
            { error: uploadError.message },
            { status: 400 }
        );
    }

    const { data: publicUrlData } = supabase.storage
        .from("reports")
        .getPublicUrl(storagePath);

    return NextResponse.json({
        ok: true,
        file_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        file_name: file.name,
    });
}