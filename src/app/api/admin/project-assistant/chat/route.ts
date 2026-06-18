import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    assertProjectAssistantAccess,
    buildProjectAssistantContext,
} from "@/lib/admin/projectAssistantContext.server";
import { buildProjectAssistantInstructions } from "@/lib/admin/projectAssistantPrompt";

type ChatRole = "user" | "assistant";

type ChatMessage = {
    role: ChatRole;
    content: string;
};

type OpenAIResponsePayload = {
    output?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
            refusal?: string;
        }>;
    }>;
    error?: {
        message?: string;
    };
};

function normalizeMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];

    return value
        .slice(-16)
        .map((item) => {
            if (typeof item !== "object" || item === null) return null;

            const candidate = item as { role?: unknown; content?: unknown };
            const role = candidate.role;
            const content = typeof candidate.content === "string" ? candidate.content.trim() : "";

            if ((role !== "user" && role !== "assistant") || !content) return null;

            return {
                role,
                content: content.slice(0, 6000),
            } satisfies ChatMessage;
        })
        .filter((message): message is ChatMessage => message !== null);
}

function extractResponseText(payload: OpenAIResponsePayload) {
    const parts: string[] = [];

    for (const item of payload.output ?? []) {
        if (item.type !== "message") continue;

        for (const content of item.content ?? []) {
            if (content.type === "output_text" && content.text) {
                parts.push(content.text);
            }

            if (content.type === "refusal" && content.refusal) {
                parts.push(content.refusal);
            }
        }
    }

    return parts.join("\n\n").trim();
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: { projectSlug?: unknown; messages?: unknown };

    try {
        body = (await request.json()) as { projectSlug?: unknown; messages?: unknown };
    } catch {
        return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
    }

    const projectSlug = typeof body.projectSlug === "string" ? body.projectSlug.trim() : "";
    const messages = normalizeMessages(body.messages);

    if (!/^[a-z0-9-]{1,80}$/.test(projectSlug)) {
        return NextResponse.json({ error: "Invalid project slug" }, { status: 400 });
    }

    if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
        return NextResponse.json({ error: "A user message is required" }, { status: 400 });
    }

    const allowed = await assertProjectAssistantAccess(supabase, user.id, projectSlug);

    if (!allowed) {
        return NextResponse.json({ error: "Project access denied" }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            {
                error:
                    "Tropo is installed, but OPENAI_API_KEY is not configured on this environment.",
            },
            { status: 503 },
        );
    }

    try {
        const projectContext = await buildProjectAssistantContext(supabase, projectSlug);
        const model = process.env.OPENAI_PROJECT_ASSISTANT_MODEL?.trim() || "gpt-5.4-mini";

        const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                instructions: buildProjectAssistantInstructions(projectContext),
                input: messages.map((message) => ({
                    role: message.role,
                    content: message.content,
                })),
                reasoning: { effort: "low" },
                max_output_tokens: 1400,
                store: false,
            }),
            cache: "no-store",
        });

        const payload = (await openAIResponse.json()) as OpenAIResponsePayload;

        if (!openAIResponse.ok) {
            const providerMessage = payload.error?.message;
            return NextResponse.json(
                {
                    error: providerMessage
                        ? `OpenAI request failed: ${providerMessage}`
                        : "OpenAI request failed",
                },
                { status: openAIResponse.status },
            );
        }

        const reply = extractResponseText(payload);

        if (!reply) {
            return NextResponse.json(
                { error: "Tropo returned an empty response" },
                { status: 502 },
            );
        }

        return NextResponse.json(
            { reply, model },
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
                        : "Failed to build Tropo project context",
            },
            { status: 500 },
        );
    }
}
