export const PROMPT_VERSION_TYPES = ["system", "developer", "user", "template"] as const;

export type PromptVersionType = (typeof PROMPT_VERSION_TYPES)[number];

export function isPromptVersionType(value: unknown): value is PromptVersionType {
    return typeof value === "string" && PROMPT_VERSION_TYPES.includes(value as PromptVersionType);
}

export function sanitizePromptVersionType(value: unknown): PromptVersionType | null {
    return isPromptVersionType(value) ? value : null;
}

export function normalizePromptVersionContent(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizePromptVersionName(value: unknown, type: PromptVersionType) {
    const trimmed = typeof value === "string" ? value.trim() : "";

    if (trimmed) {
        return trimmed.slice(0, 80);
    }

    return `${type[0].toUpperCase()}${type.slice(1)} prompt`;
}
