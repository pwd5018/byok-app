export type SupportedProvider = "groq";

export type GroqModelOption = {
    id: string;
    label: string;
    provider: SupportedProvider;
    availability: "free" | "paid";
    stage: "production" | "preview";
    inputPrice: string;
    outputPrice: string;
    contextWindow: string;
};

export const GROQ_CHAT_MODELS: GroqModelOption[] = [
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
];

export const DEFAULT_CHAT_PROVIDER: SupportedProvider = "groq";
export const DEFAULT_CHAT_MODEL = "openai/gpt-oss-20b";

export function findGroqChatModel(modelId: string) {
    return GROQ_CHAT_MODELS.find((model) => model.id === modelId) ?? null;
}
