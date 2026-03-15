import type { GenerationControls } from "@/lib/chatOptions";
import type { ChatMessage } from "@/lib/groq";

type TogetherValidationResult =
    | { ok: true }
    | { ok: false; error: string };

type TogetherModelListResponse = {
    data?: Array<{
        id?: string;
        display_name?: string;
        context_length?: number;
        type?: string;
    }>;
    error?: {
        message?: string;
    };
};

function parseTogetherError(data: unknown, fallback: string) {
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

export async function validateTogetherApiKey(
    apiKey: string
): Promise<TogetherValidationResult> {
    try {
        const res = await fetch("https://api.together.xyz/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        const data = (await res.json().catch(() => null)) as TogetherModelListResponse | null;

        if (res.ok) {
            return { ok: true };
        }

        return {
            ok: false,
            error: parseTogetherError(data, `Together returned ${res.status}`),
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to reach Together",
        };
    }
}

export async function listTogetherModels(apiKey: string) {
    const res = await fetch("https://api.together.xyz/v1/models", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as TogetherModelListResponse | null;

    if (!res.ok) {
        throw new Error(parseTogetherError(data, `Together returned ${res.status}`));
    }

    return Array.isArray(data?.data)
        ? data.data
              .filter((entry) => typeof entry?.id === "string" && entry.type !== "image")
              .map((entry) => ({
                  id: entry.id as string,
                  label:
                      typeof entry.display_name === "string"
                          ? entry.display_name
                          : (entry.id as string),
                  availability: "unknown" as const,
                  stage: "production" as const,
                  inputPrice: "Check Together pricing",
                  outputPrice: "Check Together pricing",
                  contextWindow:
                      typeof entry.context_length === "number"
                          ? Intl.NumberFormat("en-US", { notation: "compact" }).format(entry.context_length)
                          : "Unknown",
              }))
        : [];
}

type TogetherChatParams = {
    apiKey: string;
    messages: ChatMessage[];
    model: string;
    controls?: GenerationControls;
};

export async function createTogetherChatCompletion({
    apiKey,
    messages,
    model,
    controls = {},
}: TogetherChatParams) {
    const body = {
        model,
        messages,
        temperature: controls.temperature ?? 0.7,
        top_p: controls.top_p,
        max_tokens: controls.max_tokens ?? 512,
        frequency_penalty: controls.frequency_penalty,
        presence_penalty: controls.presence_penalty,
        seed: controls.seed,
    };

    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(
            parseTogetherError(data, `Together request failed with status ${res.status}`)
        );
    }

    return data;
}
