export type ReasoningEffort = "low" | "medium" | "high";
export type VerbosityLevel = "low" | "medium" | "high";

export type GenerationControls = {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
    reasoning_effort?: ReasoningEffort;
    verbosity?: VerbosityLevel;
};

function toOptionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number | undefined, min: number, max: number) {
    if (value === undefined) return undefined;
    return Math.min(max, Math.max(min, value));
}

export function sanitizeGenerationControls(input: unknown): GenerationControls {
    if (!input || typeof input !== "object") {
        return {};
    }

    const raw = input as Record<string, unknown>;
    const reasoning = raw.reasoning_effort;
    const verbosity = raw.verbosity;

    return {
        temperature: clamp(toOptionalNumber(raw.temperature), 0, 2),
        top_p: clamp(toOptionalNumber(raw.top_p), 0, 1),
        max_tokens: clamp(toOptionalNumber(raw.max_tokens), 1, 4096),
        frequency_penalty: clamp(toOptionalNumber(raw.frequency_penalty), -2, 2),
        presence_penalty: clamp(toOptionalNumber(raw.presence_penalty), -2, 2),
        seed: clamp(toOptionalNumber(raw.seed), 0, 2147483647),
        reasoning_effort:
            reasoning === "low" || reasoning === "medium" || reasoning === "high"
                ? reasoning
                : undefined,
        verbosity:
            verbosity === "low" || verbosity === "medium" || verbosity === "high"
                ? verbosity
                : undefined,
    };
}
