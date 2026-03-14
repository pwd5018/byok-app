"use client";

import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import {
    DEFAULT_CHAT_PROVIDER,
    PROVIDERS,
    getDefaultModel,
    getModelLabel,
    getProviderDefinition,
    getProviderModels,
    mergeProviderModels,
    type LiveModelOption,
    type SupportedProvider,
} from "@/lib/modelCatalog";

type ChatResult = {
    output?: string;
    model?: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
    error?: string;
};

type ChatHistoryItem = {
    id: string;
    role: string;
    content: string;
    model: string | null;
    createdAt: Date;
};

type ChatFormProps = {
    history: ChatHistoryItem[];
};

type ModelResponse = {
    models?: LiveModelOption[];
    error?: string;
};

function formatTimestamp(value: Date) {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getRoleLabel(role: string) {
    if (role === "assistant") return "Assistant";
    if (role === "user") return "You";
    return role;
}

function getCatalogFallback(provider: SupportedProvider) {
    return mergeProviderModels(
        provider,
        getProviderModels(provider).map((entry) => ({ id: entry.id }))
    );
}

type HistoryMessageProps = {
    message: ChatHistoryItem;
};

const HistoryMessage = memo(function HistoryMessage({ message }: HistoryMessageProps) {
    const isUser = message.role === "user";

    return (
        <article
            className={`rounded-[20px] border px-4 py-3 transition ${
                isUser
                    ? "ml-4 border-amber-200 bg-[linear-gradient(180deg,rgba(255,245,225,0.98),rgba(255,238,207,0.95))]"
                    : "mr-4 border-slate-200 bg-white/92"
            }`}
            style={{
                contentVisibility: "auto",
                containIntrinsicSize: "220px",
            }}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                            isUser
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                        }`}
                    >
                        {getRoleLabel(message.role)}
                    </span>
                    {message.model ? (
                        <span className="text-xs text-slate-500">{getModelLabel(message.model) || message.model}</span>
                    ) : null}
                </div>
                <span className="text-xs text-slate-500">{formatTimestamp(message.createdAt)}</span>
            </div>

            {isUser ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {message.content}
                </p>
            ) : (
                <div className="mt-3 text-sm text-slate-800">
                    <MarkdownMessage content={message.content} />
                </div>
            )}
        </article>
    );
});

export default function ChatForm({ history }: ChatFormProps) {
    const router = useRouter();
    const [provider, setProvider] = useState<SupportedProvider>(DEFAULT_CHAT_PROVIDER);
    const [models, setModels] = useState<LiveModelOption[]>(getCatalogFallback(DEFAULT_CHAT_PROVIDER));
    const [modelsMessage, setModelsMessage] = useState(
        `Using current ${getProviderDefinition(DEFAULT_CHAT_PROVIDER).label} catalog.`
    );
    const [model, setModel] = useState(getDefaultModel(DEFAULT_CHAT_PROVIDER));
    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState<ChatResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const providerDefinition = getProviderDefinition(provider);
        const catalogFallback = getCatalogFallback(provider);

        async function loadModels() {
            try {
                const res = await fetch(`/api/models/${provider}`, {
                    cache: "no-store",
                });

                const data = (await res.json().catch(() => null)) as ModelResponse | null;

                if (!res.ok || !data?.models?.length) {
                    if (!ignore) {
                        setModels(catalogFallback);
                        setModelsMessage(
                            data?.error || "Live models unavailable, showing catalog fallback."
                        );
                        setModel((current) =>
                            catalogFallback.some((entry) => entry.id === current)
                                ? current
                                : getDefaultModel(provider)
                        );
                    }
                    return;
                }

                if (!ignore) {
                    setModels(data.models);
                    setModelsMessage(`Live models loaded from ${providerDefinition.label}.`);
                    setModel((current) =>
                        data.models?.some((entry) => entry.id === current)
                            ? current
                            : data.models?.[0]?.id || getDefaultModel(provider)
                    );
                }
            } catch {
                if (!ignore) {
                    setModels(catalogFallback);
                    setModelsMessage("Live models unavailable, showing catalog fallback.");
                    setModel((current) =>
                        catalogFallback.some((entry) => entry.id === current)
                            ? current
                            : getDefaultModel(provider)
                    );
                }
            }
        }

        loadModels();

        return () => {
            ignore = true;
        };
    }, [provider]);

    const providerFallback = getCatalogFallback(provider);
    const selectedModel =
        models.find((option) => option.id === model) ?? models[0] ?? providerFallback[0];

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt, provider, model }),
            });

            const data = await res.json();

            if (!res.ok) {
                setResult({
                    error: data.error || "Request failed",
                });
                setLoading(false);
                return;
            }

            setResult(data);
            setPrompt("");
            setLoading(false);
            router.refresh();
        } catch {
            setResult({
                error: "Network error while calling /api/chat",
            });
            setLoading(false);
        }
    }

    return (
        <section className="glass-panel rounded-[30px] p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="eyebrow">Prompt playground</p>
                    <h2 className="display-font text-2xl font-semibold text-slate-950">Try your saved provider key</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Choose a provider and model, then send a prompt using the matching encrypted key already attached to your account.
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600">
                    Recent prompts and replies stay visible below.
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[28px] border border-slate-200/80 bg-white/78 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.06)]"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Composer</p>
                                    <p className="mt-1 text-sm text-slate-600">Draft the next prompt and send it with the selected saved key.</p>
                                </div>
                                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                    {loading ? "Working..." : "Ready"}
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                                <div className="space-y-2">
                                    <label htmlFor="provider" className="text-sm font-semibold text-slate-800">
                                        Provider
                                    </label>
                                    <select
                                        id="provider"
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value as SupportedProvider)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        {PROVIDERS.map((entry) => (
                                            <option key={entry.id} value={entry.id}>
                                                {entry.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="model" className="text-sm font-semibold text-slate-800">
                                        Model
                                    </label>
                                    <select
                                        id="model"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                    >
                                        {models.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label} - {option.availability === "free" ? "Free" : option.availability === "paid" ? "Paid" : "Check pricing"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,244,236,0.95))] p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                        {selectedModel.label}
                                    </span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        selectedModel.availability === "free"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : selectedModel.availability === "paid"
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-slate-100 text-slate-700"
                                    }`}>
                                        {selectedModel.availability === "free"
                                            ? "Free plan"
                                            : selectedModel.availability === "paid"
                                                ? "Paid"
                                                : "Pricing unknown"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {selectedModel.stage === "production" ? "Production" : "Preview"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {selectedModel.contextWindow} context
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {selectedModel.source === "live" ? "Live list" : "Catalog fallback"}
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">Input:</span> {selectedModel.inputPrice}
                                    </div>
                                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                                        <span className="font-semibold text-slate-900">Output:</span> {selectedModel.outputPrice}
                                    </div>
                                </div>

                                <p className="mt-3 text-xs text-slate-500">{modelsMessage}</p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ask for a summary, brainstorm ideas, or draft content..."
                                className="min-h-52 w-full rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,246,240,0.92))] px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                required
                            />

                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                                    <span className="rounded-full bg-slate-100 px-3 py-1">Encrypted key access</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1">Single-turn prompt</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1">History saved automatically</span>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? "Sending..." : "Send prompt"}
                                </button>
                            </div>
                        </div>
                    </form>

                    {result?.error ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {result.error}
                        </div>
                    ) : null}

                    {result?.output ? (
                        <div className="rounded-[28px] border border-slate-200/80 bg-white/82 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.05)]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest reply</p>
                                    <h3 className="display-font mt-1 text-xl font-semibold text-slate-950">Fresh response</h3>
                                </div>
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                                    {getModelLabel(result.model ?? null) || "Unknown model"}
                                </div>
                            </div>

                            <div className="mt-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,244,237,0.95))] p-5 text-[15px] text-slate-800">
                                <MarkdownMessage content={result.output} />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model</p>
                                    <p className="mt-2 text-sm font-medium text-slate-900">{getModelLabel(result.model ?? null) || "Unknown"}</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total tokens</p>
                                    <p className="mt-2 text-sm font-medium text-slate-900">{result.usage?.total_tokens ?? "n/a"}</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt tokens</p>
                                    <p className="mt-2 text-sm font-medium text-slate-900">{result.usage?.prompt_tokens ?? "n/a"}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,243,235,0.88))] p-5 shadow-[0_16px_40px_rgba(20,33,61,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="eyebrow">Recent conversation</p>
                            <h3 className="display-font text-xl font-semibold text-slate-950">Chat history</h3>
                        </div>
                        <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600">
                            {history.length} message{history.length === 1 ? "" : "s"}
                        </div>
                    </div>

                    <div className="mt-4 max-h-[42rem] space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                        {history.length ? (
                            history.map((message) => (
                                <HistoryMessage key={message.id} message={message} />
                            ))
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                                No chat history yet. Send your first prompt to start building the conversation log.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
