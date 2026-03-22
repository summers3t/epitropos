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

    if (!report || !report.storage_path) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
        .from("reports")
        .download(report.storage_path);

    if (downloadError) {
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