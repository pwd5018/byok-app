import type { ChatMessage } from "@/lib/groq";

type OpenRouterValidationResult =
    | { ok: true }
    | { ok: false; error: string };

type OpenRouterKeyResponse = {
    error?: {
        message?: string;
    };
};

type OpenRouterModelListResponse = {
    data?: Array<{
        id?: string;
        name?: string;
        context_length?: number;
        pricing?: {
            prompt?: string;
            completion?: string;
            request?: string;
        };
    }>;
    error?: {
        message?: string;
    };
};

function parseOpenRouterError(data: unknown, fallback: string) {
    if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof data.error.message === "string"
    ) {
        return data.error.message;
    }

    return fallback;
}

function isFreePricing(pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
}) {
    return (
        pricing?.prompt === "0" &&
        pricing?.completion === "0" &&
        (pricing.request === undefined || pricing.request === "0")
    );
}

export async function validateOpenRouterApiKey(
    apiKey: string
): Promise<OpenRouterValidationResult> {
    try {
        const res = await fetch("https://openrouter.ai/api/v1/key", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        const data = (await res.json().catch(() => null)) as OpenRouterKeyResponse | null;

        if (res.ok) {
            return { ok: true };
        }

        return {
            ok: false,
            error: parseOpenRouterError(data, `OpenRouter returned ${res.status}`),
        };
    } catch (error) {
        return {
            ok: false,
            error:
                error instanceof Error ? error.message : "Failed to reach OpenRouter",
        };
    }
}

export async function listOpenRouterModels(apiKey: string) {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as OpenRouterModelListResponse | null;

    if (!res.ok) {
        throw new Error(
            parseOpenRouterError(data, `OpenRouter returned ${res.status}`)
        );
    }

    return Array.isArray(data?.data)
        ? data.data
              .filter((entry) => typeof entry?.id === "string" && isFreePricing(entry.pricing))
              .map((entry) => ({
                  id: entry.id as string,
                  label: typeof entry.name === "string" ? entry.name : (entry.id as string),
                  availability: "free" as const,
                  stage: "production" as const,
                  inputPrice: "$0 / 1M input",
                  outputPrice: "$0 / 1M output",
                  contextWindow:
                      typeof entry.context_length === "number"
                          ? Intl.NumberFormat("en-US", { notation: "compact" }).format(entry.context_length)
                          : "Unknown",
              }))
        : [];
}

type OpenRouterChatParams = {
    apiKey: string;
    messages: ChatMessage[];
    model: string;
    temperature?: number;
    max_tokens?: number;
};

export async function createOpenRouterChatCompletion({
    apiKey,
    messages,
    model,
    temperature = 0.7,
    max_tokens = 512,
}: OpenRouterChatParams) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
            "X-Title": "BYOK Provider Workspace",
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens,
        }),
        cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(
            parseOpenRouterError(data, `OpenRouter request failed with status ${res.status}`)
        );
    }

    return data;
}
