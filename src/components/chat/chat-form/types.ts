import type { ReasoningEffort, VerbosityLevel } from "../../../lib/chatOptions.ts";
import type { LiveModelOption, SupportedProvider } from "../../../lib/modelCatalog.ts";
import type { PromptVersionType } from "../../../lib/promptVersions.ts";
import type { ModelRatingSummary, ResponseScores } from "../../../lib/responseRatings.ts";

export type ChatResult = {
    output?: string;
    model?: string;
    provider?: SupportedProvider;
    latencyMs?: number | null;
    messageId?: string | null;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
    error?: string;
};

export type CompareResult = {
    provider: SupportedProvider;
    model: string;
    status: "success" | "error";
    output?: string;
    error?: string;
    latencyMs: number | null;
    messageId?: string | null;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
    toolCalls: number;
};

export type ChatHistoryItem = {
    id: string;
    role: string;
    content: string;
    provider: string | null;
    model: string | null;
    runMode: string | null;
    memoryMode: string | null;
    comparisonGroupId: string | null;
    latencyMs: number | null;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    toolCalls: number | null;
    createdAt: Date | string;
};

export type ChatFormProps = {
    history: ChatHistoryItem[];
    configuredProviders: SupportedProvider[];
};

export type ModelResponse = {
    models?: LiveModelOption[];
    error?: string;
};

export type ConversationGroup = {
    id: string;
    messages: ChatHistoryItem[];
};

export type ComparisonTarget = {
    provider: SupportedProvider;
    model: string;
};

export type FormMode = "single" | "compare";
export type MemoryMode = "shared" | "provider" | "model" | "stateless";

export type ControlFormState = {
    temperature: string;
    top_p: string;
    max_tokens: string;
    frequency_penalty: string;
    presence_penalty: string;
    seed: string;
    reasoning_effort: "" | ReasoningEffort;
    verbosity: "" | VerbosityLevel;
};

export type PromptVersionRecord = {
    id: string;
    name: string;
    type: PromptVersionType;
    content: string;
    createdAt: string;
    updatedAt: string;
};

export type PromptVersionsByType = Record<PromptVersionType, PromptVersionRecord[]>;
export type PromptVersionNames = Record<PromptVersionType, string>;
export type PromptVersionSelections = Record<PromptVersionType, string>;

export type RatingsByMessageId = Record<string, ResponseScores>;
export type SavingRatings = Record<string, boolean>;
export type RatingSummary = ModelRatingSummary[];
