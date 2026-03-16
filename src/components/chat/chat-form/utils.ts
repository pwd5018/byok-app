import {
    DEFAULT_CHAT_PROVIDER,
    getDefaultModel,
    getProviderModels,
    mergeProviderModels,
    type SupportedProvider,
} from "../../../lib/modelCatalog.ts";
import type { GenerationControls } from "../../../lib/chatOptions.ts";
import type {
    ChatHistoryItem,
    ComparisonTarget,
    ControlFormState,
    ConversationGroup,
} from "./types.ts";

export const INITIAL_VISIBLE_GROUPS = 8;
export const GROUPS_PER_PAGE = 8;
export const EMPTY_CONTROLS: ControlFormState = {
    temperature: "",
    top_p: "",
    max_tokens: "",
    frequency_penalty: "",
    presence_penalty: "",
    seed: "",
    reasoning_effort: "",
    verbosity: "",
};
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant inside a bring-your-own-key multi-provider app.";

export function getCatalogFallback(provider: SupportedProvider) {
    return mergeProviderModels(
        provider,
        getProviderModels(provider).map((entry) => ({ id: entry.id }))
    );
}

export function formatTimestamp(value: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export function getRoleLabel(role: string) {
    if (role === "assistant") return "Assistant";
    if (role === "user") return "You";
    return role;
}

export function buildConversationGroups(history: ChatHistoryItem[]) {
    const groups: ConversationGroup[] = [];

    for (const message of history) {
        const lastGroup = groups[groups.length - 1];

        if (!lastGroup || message.role === "user") {
            groups.push({
                id: message.id,
                messages: [message],
            });
            continue;
        }

        lastGroup.messages.push(message);
    }

    return groups;
}

export function toOptionalNumber(value: string) {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildControlsPayload(controls: ControlFormState): GenerationControls {
    return {
        temperature: toOptionalNumber(controls.temperature),
        top_p: toOptionalNumber(controls.top_p),
        max_tokens: toOptionalNumber(controls.max_tokens),
        frequency_penalty: toOptionalNumber(controls.frequency_penalty),
        presence_penalty: toOptionalNumber(controls.presence_penalty),
        seed: toOptionalNumber(controls.seed),
        reasoning_effort: controls.reasoning_effort || undefined,
        verbosity: controls.verbosity || undefined,
    };
}

export function getTargetKey(target: ComparisonTarget) {
    return `${target.provider}:${target.model}`;
}

export function getInitialTargets(configuredProviders: SupportedProvider[]) {
    const initialProvider = configuredProviders[0] ?? DEFAULT_CHAT_PROVIDER;
    const secondProvider = configuredProviders[1] ?? initialProvider;

    return [
        { provider: initialProvider, model: getDefaultModel(initialProvider) },
        { provider: secondProvider, model: getDefaultModel(secondProvider) },
    ];
}
