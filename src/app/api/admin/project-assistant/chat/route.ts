import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    assertProjectAssistantAccess,
    buildProjectAssistantContext,
} from "@/lib/admin/projectAssistantContext.server";
import { selectProjectAssistantContext } from "@/lib/admin/projectAssistantContextSelection";
import { buildProjectAssistantInstructions } from "@/lib/admin/projectAssistantPrompt";
import {
    requestTropoCompletion,
    TropoProviderError,
} from "@/lib/admin/tropoAiProvider.server";

type ChatRole = "user" | "assistant";

type ChatMessage = {
    role: ChatRole;
    content: string;
};

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARACTERS = 2400;
const MAX_HISTORY_CHARACTERS = 5000;

function normalizeMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];

    const validMessages = value
        .slice(-MAX_HISTORY_MESSAGES)
        .map((item) => {
            if (typeof item !== "object" || item === null) return null;

            const candidate = item as { role?: unknown; content?: unknown };
            const role = candidate.role;
            const content = typeof candidate.content === "string" ? candidate.content.trim() : "";

            if ((role !== "user" && role !== "assistant") || !content) return null;

            return {
                role,
                content: content.slice(0, MAX_MESSAGE_CHARACTERS),
            } satisfies ChatMessage;
        })
        .filter((message): message is ChatMessage => message !== null);

    const selected: ChatMessage[] = [];
    let characterCount = 0;

    for (let index = validMessages.length - 1; index >= 0; index -= 1) {
        const message = validMessages[index];
        if (!message) continue;

        const remainingCharacters = MAX_HISTORY_CHARACTERS - characterCount;
        if (remainingCharacters <= 0) break;

        const content = message.content.slice(-remainingCharacters);
        selected.unshift({ ...message, content });
        characterCount += content.length;
    }

    return selected;
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

    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || latestMessage.role !== "user") {
        return NextResponse.json({ error: "A user message is required" }, { status: 400 });
    }

    const allowed = await assertProjectAssistantAccess(supabase, user.id, projectSlug);

    if (!allowed) {
        return NextResponse.json({ error: "Project access denied" }, { status: 403 });
    }

    try {
        const fullProjectContext = await buildProjectAssistantContext(supabase, projectSlug);
        const selectedProjectContext = selectProjectAssistantContext(
            fullProjectContext,
            latestMessage.content,
        );
        const completion = await requestTropoCompletion({
            instructions: buildProjectAssistantInstructions(selectedProjectContext),
            messages,
        });

        return NextResponse.json(
            {
                reply: completion.reply,
                proposedActions: completion.proposedActions,
                model: completion.model,
                provider: completion.provider,
            },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                },
            },
        );
    } catch (error) {
        if (error instanceof TropoProviderError) {
            return NextResponse.json(
                {
                    error: error.message,
                    provider: error.provider,
                    retryAfterSeconds: error.retryAfterSeconds,
                },
                {
                    status: error.status,
                    headers:
                        error.retryAfterSeconds === null
                            ? undefined
                            : { "Retry-After": String(Math.ceil(error.retryAfterSeconds)) },
                },
            );
        }

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
