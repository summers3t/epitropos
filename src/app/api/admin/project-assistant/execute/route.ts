import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertProjectAssistantAccess } from "@/lib/admin/projectAssistantContext.server";
import { executeTropoAction } from "@/lib/admin/tropoActionExecutor.server";

export async function POST(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: { projectSlug?: unknown; action?: unknown };

    try {
        body = (await request.json()) as { projectSlug?: unknown; action?: unknown };
    } catch {
        return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
    }

    const projectSlug = typeof body.projectSlug === "string" ? body.projectSlug.trim() : "";

    if (!/^[a-z0-9-]{1,80}$/.test(projectSlug)) {
        return NextResponse.json({ error: "Invalid project slug" }, { status: 400 });
    }

    const allowed = await assertProjectAssistantAccess(supabase, user.id, projectSlug);

    if (!allowed) {
        return NextResponse.json({ error: "Project access denied" }, { status: 403 });
    }

    try {
        const result = await executeTropoAction({
            supabase,
            projectSlug,
            action: body.action,
        });

        return NextResponse.json(
            { result },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to execute Tropo action",
            },
            { status: 400 },
        );
    }
}
