type TropoChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type ResponsesPayload = {
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
        code?: string;
        type?: string;
    };
};

export type TropoProviderName = "groq" | "openai";

export type TropoCompletionResult = {
    reply: string;
    provider: TropoProviderName;
    model: string;
};

export class TropoProviderError extends Error {
    status: number;
    provider: TropoProviderName | "configuration";
    retryAfterSeconds: number | null;

    constructor(
        message: string,
        options: {
            status: number;
            provider: TropoProviderName | "configuration";
            retryAfterSeconds?: number | null;
        },
    ) {
        super(message);
        this.name = "TropoProviderError";
        this.status = options.status;
        this.provider = options.provider;
        this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    }
}

type ProviderConfig = {
    provider: TropoProviderName;
    apiKey: string;
    endpoint: string;
    model: string;
};

function normalizeProvider(value: string | undefined): TropoProviderName {
    const normalized = value?.trim().toLowerCase() || "groq";

    if (normalized === "groq" || normalized === "openai") {
        return normalized;
    }

    throw new TropoProviderError(
        `Unsupported TROPO_AI_PROVIDER value: ${normalized}. Use "groq" or "openai".`,
        {
            status: 503,
            provider: "configuration",
        },
    );
}

function readProviderConfig(): ProviderConfig {
    const provider = normalizeProvider(process.env.TROPO_AI_PROVIDER);
    const commonModel = process.env.TROPO_AI_MODEL?.trim();

    if (provider === "groq") {
        const apiKey = process.env.GROQ_API_KEY?.trim();

        if (!apiKey) {
            throw new TropoProviderError(
                "Tropo is configured for Groq, but GROQ_API_KEY is missing on this environment.",
                {
                    status: 503,
                    provider: "configuration",
                },
            );
        }

        return {
            provider,
            apiKey,
            endpoint: "https://api.groq.com/openai/v1/responses",
            model:
                commonModel ||
                process.env.GROQ_PROJECT_ASSISTANT_MODEL?.trim() ||
                "openai/gpt-oss-120b",
        };
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        throw new TropoProviderError(
            "Tropo is configured for OpenAI, but OPENAI_API_KEY is missing on this environment.",
            {
                status: 503,
                provider: "configuration",
            },
        );
    }

    return {
        provider,
        apiKey,
        endpoint: "https://api.openai.com/v1/responses",
        model:
            commonModel ||
            process.env.OPENAI_PROJECT_ASSISTANT_MODEL?.trim() ||
            "gpt-5.4-mini",
    };
}

function extractResponseText(payload: ResponsesPayload) {
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

function parseRetryAfter(value: string | null) {
    if (!value) return null;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function providerLabel(provider: TropoProviderName) {
    return provider === "groq" ? "Groq" : "OpenAI";
}

export async function requestTropoCompletion(args: {
    instructions: string;
    messages: TropoChatMessage[];
}): Promise<TropoCompletionResult> {
    const config = readProviderConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 70_000);

    const requestBody: Record<string, unknown> = {
        model: config.model,
        instructions: args.instructions,
        input: args.messages.map((message) => ({
            role: message.role,
            content: message.content,
        })),
        reasoning: { effort: "low" },
        max_output_tokens: 900,
    };

    // Groq's Responses API currently rejects the OpenAI `store` field.
    if (config.provider === "openai") {
        requestBody.store = false;
    }

    try {
        const response = await fetch(config.endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            cache: "no-store",
            signal: controller.signal,
        });

        const rawBody = await response.text();
        let payload: ResponsesPayload = {};

        if (rawBody) {
            try {
                payload = JSON.parse(rawBody) as ResponsesPayload;
            } catch {
                payload = {};
            }
        }

        if (!response.ok) {
            const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
            const providerMessage = payload.error?.message?.trim();
            const label = providerLabel(config.provider);

            if (response.status === 429) {
                const retryText =
                    retryAfterSeconds === null
                        ? "Please wait briefly and try again."
                        : `Try again in about ${Math.max(1, Math.ceil(retryAfterSeconds))} seconds.`;

                throw new TropoProviderError(`${label} rate limit reached. ${retryText}`, {
                    status: 429,
                    provider: config.provider,
                    retryAfterSeconds,
                });
            }

            throw new TropoProviderError(
                providerMessage
                    ? `${label} request failed: ${providerMessage}`
                    : `${label} request failed with status ${response.status}.`,
                {
                    status: response.status,
                    provider: config.provider,
                },
            );
        }

        const reply = extractResponseText(payload);

        if (!reply) {
            throw new TropoProviderError("Tropo returned an empty response.", {
                status: 502,
                provider: config.provider,
            });
        }

        return {
            reply,
            provider: config.provider,
            model: config.model,
        };
    } catch (error) {
        if (error instanceof TropoProviderError) {
            throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
            throw new TropoProviderError(
                `${providerLabel(config.provider)} did not respond within 70 seconds.`,
                {
                    status: 504,
                    provider: config.provider,
                },
            );
        }

        throw new TropoProviderError(
            error instanceof Error
                ? `${providerLabel(config.provider)} request failed: ${error.message}`
                : `${providerLabel(config.provider)} request failed.`,
            {
                status: 502,
                provider: config.provider,
            },
        );
    } finally {
        clearTimeout(timeoutId);
    }
}
