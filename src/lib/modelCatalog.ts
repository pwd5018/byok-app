export type SupportedProvider = "groq" | "openrouter" | "google" | "together";
export type ModelAvailability = "free" | "paid" | "unknown";

export type ProviderDefinition = {
    id: SupportedProvider;
    label: string;
    keyLabel: string;
    keyPlaceholder: string;
    signupUrl: string;
    freeAccessNote: string;
};

export type CatalogModelOption = {
    id: string;
    label: string;
    provider: SupportedProvider;
    availability: ModelAvailability;
    stage: "production" | "preview";
    inputPrice: string;
    outputPrice: string;
    contextWindow: string;
};

export type LiveModelOption = CatalogModelOption & {
    source: "catalog" | "live";
};

export const PROVIDERS: ProviderDefinition[] = [
    {
        id: "groq",
        label: "Groq",
        keyLabel: "Groq API key",
        keyPlaceholder: "gsk_...",
        signupUrl: "https://console.groq.com/keys",
        freeAccessNote: "Free developer access with free model options.",
    },
    {
        id: "openrouter",
        label: "OpenRouter",
        keyLabel: "OpenRouter API key",
        keyPlaceholder: "sk-or-v1-...",
        signupUrl: "https://openrouter.ai/settings/keys",
        freeAccessNote: "Free API keys and free models are available.",
    },
    {
        id: "google",
        label: "Google AI Studio",
        keyLabel: "Google Gemini API key",
        keyPlaceholder: "AIza...",
        signupUrl: "https://aistudio.google.com/apikey",
        freeAccessNote: "Free AI Studio API keys and Gemini free-tier models are available.",
    },
    {
        id: "together",
        label: "Together AI",
        keyLabel: "Together API key",
        keyPlaceholder: "your-together-api-key",
        signupUrl: "https://api.together.ai/settings/api-keys",
        freeAccessNote: "Free API keys are available and new accounts include starter credits.",
    },
];

const MODEL_CATALOG: Record<SupportedProvider, CatalogModelOption[]> = {
    groq: [
        {
            id: "llama-3.1-8b-instant",
            label: "Llama 3.1 8B Instant",
            provider: "groq",
            availability: "free",
            stage: "production",
            inputPrice: "$0.05 / 1M input",
            outputPrice: "$0.08 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "llama-3.3-70b-versatile",
            label: "Llama 3.3 70B Versatile",
            provider: "groq",
            availability: "free",
            stage: "production",
            inputPrice: "$0.59 / 1M input",
            outputPrice: "$0.79 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "openai/gpt-oss-20b",
            label: "GPT OSS 20B",
            provider: "groq",
            availability: "free",
            stage: "production",
            inputPrice: "$0.075 / 1M input",
            outputPrice: "$0.30 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "openai/gpt-oss-120b",
            label: "GPT OSS 120B",
            provider: "groq",
            availability: "free",
            stage: "production",
            inputPrice: "$0.15 / 1M input",
            outputPrice: "$0.60 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "meta-llama/llama-4-scout-17b-16e-instruct",
            label: "Llama 4 Scout 17B 16E",
            provider: "groq",
            availability: "free",
            stage: "preview",
            inputPrice: "$0.11 / 1M input",
            outputPrice: "$0.34 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "moonshotai/kimi-k2-instruct-0905",
            label: "Kimi K2 0905",
            provider: "groq",
            availability: "free",
            stage: "preview",
            inputPrice: "$1.00 / 1M input",
            outputPrice: "$3.00 / 1M output",
            contextWindow: "262K",
        },
        {
            id: "qwen/qwen3-32b",
            label: "Qwen3 32B",
            provider: "groq",
            availability: "free",
            stage: "preview",
            inputPrice: "$0.29 / 1M input",
            outputPrice: "$0.59 / 1M output",
            contextWindow: "131K",
        },
    ],
    openrouter: [
        {
            id: "openrouter/free",
            label: "OpenRouter Auto (Free)",
            provider: "openrouter",
            availability: "free",
            stage: "production",
            inputPrice: "$0 / 1M input",
            outputPrice: "$0 / 1M output",
            contextWindow: "Varies",
        },
        {
            id: "meta-llama/llama-3.3-8b-instruct:free",
            label: "Llama 3.3 8B Instruct",
            provider: "openrouter",
            availability: "free",
            stage: "production",
            inputPrice: "$0 / 1M input",
            outputPrice: "$0 / 1M output",
            contextWindow: "131K",
        },
        {
            id: "mistralai/mistral-small-3.1-24b-instruct:free",
            label: "Mistral Small 3.1 24B",
            provider: "openrouter",
            availability: "free",
            stage: "preview",
            inputPrice: "$0 / 1M input",
            outputPrice: "$0 / 1M output",
            contextWindow: "128K",
        },
    ],
    google: [
        {
            id: "gemini-2.5-flash",
            label: "Gemini 2.5 Flash",
            provider: "google",
            availability: "free",
            stage: "production",
            inputPrice: "Free tier available",
            outputPrice: "Free tier available",
            contextWindow: "1M",
        },
        {
            id: "gemini-2.5-flash-lite",
            label: "Gemini 2.5 Flash-Lite",
            provider: "google",
            availability: "free",
            stage: "production",
            inputPrice: "Free tier available",
            outputPrice: "Free tier available",
            contextWindow: "1M",
        },
        {
            id: "gemini-2.5-flash-lite-preview-09-2025",
            label: "Gemini 2.5 Flash-Lite Preview",
            provider: "google",
            availability: "free",
            stage: "preview",
            inputPrice: "Free tier available",
            outputPrice: "Free tier available",
            contextWindow: "1M",
        },
    ],
    together: [
        {
            id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
            label: "Llama 3.1 8B Instruct Turbo",
            provider: "together",
            availability: "unknown",
            stage: "production",
            inputPrice: "Check Together pricing",
            outputPrice: "Check Together pricing",
            contextWindow: "131K",
        },
        {
            id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            label: "Llama 3.1 70B Instruct Turbo",
            provider: "together",
            availability: "unknown",
            stage: "production",
            inputPrice: "Check Together pricing",
            outputPrice: "Check Together pricing",
            contextWindow: "131K",
        },
        {
            id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
            label: "Qwen 2.5 72B Instruct Turbo",
            provider: "together",
            availability: "unknown",
            stage: "production",
            inputPrice: "Check Together pricing",
            outputPrice: "Check Together pricing",
            contextWindow: "131K",
        },
    ],
};

export const DEFAULT_CHAT_PROVIDER: SupportedProvider = "groq";
export const DEFAULT_CHAT_MODEL = MODEL_CATALOG[DEFAULT_CHAT_PROVIDER][2].id;

export function isSupportedProvider(value: string): value is SupportedProvider {
    return PROVIDERS.some((provider) => provider.id === value);
}

export function getProviderDefinition(provider: SupportedProvider) {
    return PROVIDERS.find((entry) => entry.id === provider)!;
}

export function getProviderModels(provider: SupportedProvider) {
    return MODEL_CATALOG[provider];
}

export function getDefaultModel(provider: SupportedProvider) {
    return getProviderModels(provider)[0]?.id ?? DEFAULT_CHAT_MODEL;
}

export function findChatModel(provider: SupportedProvider, modelId: string) {
    return getProviderModels(provider).find((model) => model.id === modelId) ?? null;
}

export function getModelLabel(modelId: string | null) {
    if (!modelId) return null;

    for (const provider of PROVIDERS) {
        const match = findChatModel(provider.id, modelId);
        if (match) {
            return match.label;
        }
    }

    return modelId;
}

export function mergeProviderModels(
    provider: SupportedProvider,
    liveModels: Array<{
        id: string;
        label?: string;
        availability?: ModelAvailability;
        stage?: "production" | "preview";
        inputPrice?: string;
        outputPrice?: string;
        contextWindow?: string;
    }>
) {
    const catalog = getProviderModels(provider);
    const seen = new Set<string>();
    const merged: LiveModelOption[] = [];

    for (const model of catalog) {
        const live = liveModels.find((entry) => entry.id === model.id);
        if (!live) continue;

        seen.add(model.id);
        merged.push({
            ...model,
            label: live.label ?? model.label,
            availability: live.availability ?? model.availability,
            stage: live.stage ?? model.stage,
            inputPrice: live.inputPrice ?? model.inputPrice,
            outputPrice: live.outputPrice ?? model.outputPrice,
            contextWindow: live.contextWindow ?? model.contextWindow,
            source: "live",
        });
    }

    for (const live of liveModels) {
        if (seen.has(live.id)) continue;

        merged.push({
            id: live.id,
            label: live.label ?? live.id,
            provider,
            availability: live.availability ?? "unknown",
            stage: live.stage ?? "preview",
            inputPrice: live.inputPrice ?? "Check provider pricing",
            outputPrice: live.outputPrice ?? "Check provider pricing",
            contextWindow: live.contextWindow ?? "Unknown",
            source: "live",
        });
    }

    if (!merged.length) {
        return catalog.map((model) => ({
            ...model,
            source: "catalog" as const,
        }));
    }

    return merged;
}
