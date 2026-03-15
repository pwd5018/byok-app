import type { GenerationControls } from "@/lib/chatOptions";
import type { ChatMessage } from "@/lib/groq";

type GoogleValidationResult =
    | { ok: true }
    | { ok: false; error: string };

type GoogleModelsResponse = {
    models?: Array<{
        name?: string;
        displayName?: string;
        description?: string;
        inputTokenLimit?: number;
        supportedGenerationMethods?: string[];
    }>;
    error?: {
        message?: string;
    };
};

type GoogleGenerateContentResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    error?: {
        message?: string;
    };
};

function parseGoogleError(data: unknown, fallback: string) {
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

function normalizeGoogleModelName(name: string) {
    return name.replace(/^models\//, "");
}

export async function validateGoogleApiKey(
    apiKey: string
): Promise<GoogleValidationResult> {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            }
        );

        const data = (await res.json().catch(() => null)) as GoogleModelsResponse | null;

        if (res.ok) {
            return { ok: true };
        }

        return {
            ok: false,
            error: parseGoogleError(data, `Google returned ${res.status}`),
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to reach Google AI Studio",
        };
    }
}

export async function listGoogleModels(apiKey: string) {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        }
    );

    const data = (await res.json().catch(() => null)) as GoogleModelsResponse | null;

    if (!res.ok) {
        throw new Error(parseGoogleError(data, `Google returned ${res.status}`));
    }

    return Array.isArray(data?.models)
        ? data.models
              .filter(
                  (entry) =>
                      typeof entry?.name === "string" &&
                      entry.name.includes("gemini") &&
                      Array.isArray(entry.supportedGenerationMethods) &&
                      entry.supportedGenerationMethods.includes("generateContent")
              )
              .map((entry) => ({
                  id: normalizeGoogleModelName(entry.name as string),
                  label:
                      typeof entry.displayName === "string"
                          ? entry.displayName
                          : normalizeGoogleModelName(entry.name as string),
                  availability: "free" as const,
                  stage: "production" as const,
                  inputPrice: "Free tier available",
                  outputPrice: "Free tier available",
                  contextWindow:
                      typeof entry.inputTokenLimit === "number"
                          ? Intl.NumberFormat("en-US", { notation: "compact" }).format(entry.inputTokenLimit)
                          : "Unknown",
              }))
        : [];
}

type GoogleChatParams = {
    apiKey: string;
    messages: ChatMessage[];
    model: string;
    controls?: GenerationControls;
};

export async function createGoogleChatCompletion({
    apiKey,
    messages,
    model,
    controls = {},
}: GoogleChatParams) {
    const systemInstruction = messages.find((message) => message.role === "system")?.content;
    const userMessages = messages.filter((message) => message.role !== "system");

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                systemInstruction: systemInstruction
                    ? {
                          parts: [{ text: systemInstruction }],
                      }
                    : undefined,
                contents: userMessages.map((message) => ({
                    role: message.role === "assistant" ? "model" : "user",
                    parts: [{ text: message.content }],
                })),
                generationConfig: {
                    temperature: controls.temperature ?? 0.7,
                    topP: controls.top_p,
                    maxOutputTokens: controls.max_tokens ?? 512,
                    seed: controls.seed,
                },
            }),
            cache: "no-store",
        }
    );

    const data = (await res.json().catch(() => null)) as GoogleGenerateContentResponse | null;

    if (!res.ok) {
        throw new Error(
            parseGoogleError(data, `Google request failed with status ${res.status}`)
        );
    }

    const text =
        data?.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .map((part) => part.text)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .join("\n") ?? "";

    return {
        choices: [
            {
                message: {
                    content: text,
                },
            },
        ],
        model,
        usage: {
            prompt_tokens: data?.usageMetadata?.promptTokenCount,
            completion_tokens: data?.usageMetadata?.candidatesTokenCount,
            total_tokens: data?.usageMetadata?.totalTokenCount,
        },
    };
}
