type GroqValidationResult =
    | { ok: true }
    | { ok: false; error: string };

type GroqModelListResponse = {
    data?: Array<{
        id?: string;
    }>;
};

async function parseGroqError(res: Response) {
    let errorMessage = `Groq returned ${res.status}`;

    try {
        const data = await res.json();

        if (typeof data?.error?.message === "string") {
            errorMessage = data.error.message;
        } else if (typeof data?.message === "string") {
            errorMessage = data.message;
        }
    } catch {
        // ignore JSON parse errors
    }

    return errorMessage;
}

export async function validateGroqApiKey(
    apiKey: string
): Promise<GroqValidationResult> {
    try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (res.ok) {
            return { ok: true };
        }

        return { ok: false, error: await parseGroqError(res) };
    } catch (error) {
        return {
            ok: false,
            error:
                error instanceof Error ? error.message : "Failed to reach Groq",
        };
    }
}

export async function listGroqModels(apiKey: string) {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(await parseGroqError(res));
    }

    const data = (await res.json().catch(() => null)) as GroqModelListResponse | null;
    const models = Array.isArray(data?.data)
        ? data.data
            .map((entry) => (typeof entry?.id === "string" ? entry.id : null))
            .filter((value): value is string => Boolean(value))
        : [];

    return models;
}

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

type GroqChatParams = {
    apiKey: string;
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
};

export async function createGroqChatCompletion({
                                                   apiKey,
                                                   messages,
                                                   model = process.env.GROQ_MODEL || "openai/gpt-oss-20b",
                                                   temperature = 0.7,
                                                   max_tokens = 512,
                                               }: GroqChatParams) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
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
        const errorMessage =
            typeof data?.error?.message === "string"
                ? data.error.message
                : `Groq request failed with status ${res.status}`;

        throw new Error(errorMessage);
    }

    return data;
}
