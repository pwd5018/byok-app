
"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownMessage from '@/components/chat/MarkdownMessage';
import PurgeChatHistoryButton from '@/components/chat/PurgeChatHistoryButton';
import {
    DEFAULT_CHAT_PROVIDER,
    PROVIDERS,
    getDefaultModel,
    getModelLabel,
    getProviderDefinition,
    getProviderModels,
    isSupportedProvider,
    mergeProviderModels,
    type LiveModelOption,
    type SupportedProvider,
} from "@/lib/modelCatalog";
import type { GenerationControls, ReasoningEffort, VerbosityLevel } from "@/lib/chatOptions";

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

type CompareResult = {
    provider: SupportedProvider;
    model: string;
    status: "success" | "error";
    output?: string;
    error?: string;
    latencyMs: number | null;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
    toolCalls: number;
};

type ChatHistoryItem = {
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
    createdAt: Date;
};

type ChatFormProps = {
    history: ChatHistoryItem[];
    configuredProviders: SupportedProvider[];
};

type ModelResponse = {
    models?: LiveModelOption[];
    error?: string;
};

type ConversationGroup = {
    id: string;
    messages: ChatHistoryItem[];
};

type ComparisonTarget = {
    provider: SupportedProvider;
    model: string;
};

type FormMode = "single" | "compare";
type MemoryMode = "shared" | "provider" | "model" | "stateless";

type ControlFormState = {
    temperature: string;
    top_p: string;
    max_tokens: string;
    frequency_penalty: string;
    presence_penalty: string;
    seed: string;
    reasoning_effort: "" | ReasoningEffort;
    verbosity: "" | VerbosityLevel;
};

const INITIAL_VISIBLE_GROUPS = 8;
const GROUPS_PER_PAGE = 8;
const EMPTY_CONTROLS: ControlFormState = {
    temperature: "",
    top_p: "",
    max_tokens: "",
    frequency_penalty: "",
    presence_penalty: "",
    seed: "",
    reasoning_effort: "",
    verbosity: "",
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

function buildConversationGroups(history: ChatHistoryItem[]) {
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

function toOptionalNumber(value: string) {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function buildControlsPayload(controls: ControlFormState): GenerationControls {
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

function getTargetKey(target: ComparisonTarget) {
    return `${target.provider}:${target.model}`;
}

function ControlLabel({ label, help }: { label: string; help: string }) {
    return (
        <span className="flex min-h-6 items-center gap-3 text-sm font-semibold text-slate-800">
            <span>{label}</span>
            <button
                type="button"
                title={help}
                aria-label={`${label}: ${help}`}
                className="group flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
                ?
            </button>
        </span>
    );
}

type HistoryMessageProps = {
    message: ChatHistoryItem;
    showMetadata: boolean;
};

const HistoryMessage = memo(function HistoryMessage({ message, showMetadata }: HistoryMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={`rounded-[18px] border px-4 py-3 ${
                isUser
                    ? "border-amber-200/80 bg-amber-50/75"
                    : "border-slate-200/80 bg-white/80"
            }`}
            style={{
                contentVisibility: "auto",
                containIntrinsicSize: "220px",
            }}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            isUser
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                        }`}
                    >
                        {getRoleLabel(message.role)}
                    </span>
                    {message.model ? (
                        <span className="text-[11px] text-slate-500">{getModelLabel(message.model) || message.model}</span>
                    ) : null}
                </div>
                <span className="text-[11px] text-slate-400">{formatTimestamp(message.createdAt)}</span>
            </div>

            {showMetadata && (message.runMode || message.provider || message.latencyMs !== null || message.totalTokens !== null || message.toolCalls !== null || message.comparisonGroupId) ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {message.runMode ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Mode:</span> {message.runMode}
                        </div>
                    ) : null}
                    {message.memoryMode ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Memory:</span> {message.memoryMode}
                        </div>
                    ) : null}
                    {message.provider && isSupportedProvider(message.provider) ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Provider:</span> {getProviderDefinition(message.provider).label}
                        </div>
                    ) : null}
                    {message.latencyMs !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Latency:</span> {message.latencyMs} ms
                        </div>
                    ) : null}
                    {message.totalTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Total tokens:</span> {message.totalTokens}
                        </div>
                    ) : null}
                    {message.promptTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Prompt tokens:</span> {message.promptTokens}
                        </div>
                    ) : null}
                    {message.completionTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Completion tokens:</span> {message.completionTokens}
                        </div>
                    ) : null}
                    {message.toolCalls !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Tool calls:</span> {message.toolCalls}
                        </div>
                    ) : null}
                    {message.comparisonGroupId ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600 sm:col-span-2 xl:col-span-3">
                            <span className="font-semibold text-slate-900">Comparison group:</span> {message.comparisonGroupId}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {isUser ? (
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {message.content}
                </p>
            ) : (
                <div className="mt-2.5 text-sm text-slate-800">
                    <MarkdownMessage content={message.content} className="[&_p]:leading-6 [&_p]:text-slate-700" />
                </div>
            )}
        </div>
    );
});

type ConversationBlockProps = {
    group: ConversationGroup;
    index: number;
    showMetadata: boolean;
};

const ConversationBlock = memo(function ConversationBlock({ group, index, showMetadata }: ConversationBlockProps) {
    return (
        <section className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,247,242,0.92))] p-4 shadow-[0_10px_30px_rgba(20,33,61,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                        Exchange {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs text-slate-500">
                        {group.messages.length} message{group.messages.length === 1 ? "" : "s"}
                    </span>
                </div>
                <span className="text-[11px] text-slate-400">
                    {formatTimestamp(group.messages[group.messages.length - 1].createdAt)}
                </span>
            </div>

            <div className="mt-3 space-y-3">
                {group.messages.map((message) => (
                    <HistoryMessage key={message.id} message={message} showMetadata={showMetadata} />
                ))}
            </div>
        </section>
    );
});

export default function ChatForm({ history, configuredProviders }: ChatFormProps) {
    const router = useRouter();
    const availableProviders = useMemo(
        () => PROVIDERS.filter((entry) => configuredProviders.includes(entry.id)),
        [configuredProviders]
    );
    const initialProvider = availableProviders[0]?.id ?? DEFAULT_CHAT_PROVIDER;
    const initialTargetModel = getDefaultModel(initialProvider);

    const [mode, setMode] = useState<FormMode>("single");
    const [provider, setProvider] = useState<SupportedProvider>(initialProvider);
    const [model, setModel] = useState(getDefaultModel(initialProvider));
    const [prompt, setPrompt] = useState("");
    const [controls, setControls] = useState<ControlFormState>(EMPTY_CONTROLS);
    const [memoryMode, setMemoryMode] = useState<MemoryMode>("shared");
    const [result, setResult] = useState<ChatResult | null>(null);
    const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
    const [showHistoryMetadata, setShowHistoryMetadata] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visibleGroupCount, setVisibleGroupCount] = useState(INITIAL_VISIBLE_GROUPS);
    const [targets, setTargets] = useState<ComparisonTarget[]>([
        { provider: initialProvider, model: initialTargetModel },
        {
            provider: availableProviders[1]?.id ?? initialProvider,
            model: getDefaultModel(availableProviders[1]?.id ?? initialProvider),
        },
    ]);
    const [modelsByProvider, setModelsByProvider] = useState<Record<string, LiveModelOption[]>>({
        [initialProvider]: getCatalogFallback(initialProvider),
    });
    const [messagesByProvider, setMessagesByProvider] = useState<Record<string, string>>({
        [initialProvider]: `Using current ${getProviderDefinition(initialProvider).label} catalog.`,
    });

    const safeProvider = availableProviders.some((entry) => entry.id === provider)
        ? provider
        : initialProvider;
    const normalizedTargets = targets
        .filter((target) => availableProviders.some((entry) => entry.id === target.provider))
        .map((target) => {
            const targetModels = modelsByProvider[target.provider] ?? getCatalogFallback(target.provider);
            const normalizedModel = targetModels.some((entry) => entry.id === target.model)
                ? target.model
                : targetModels[0]?.id ?? getDefaultModel(target.provider);

            return {
                provider: target.provider,
                model: normalizedModel,
            } satisfies ComparisonTarget;
        });
    const providersToLoad = [...new Set([safeProvider, ...normalizedTargets.map((target) => target.provider)])]
        .filter((nextProvider) => !modelsByProvider[nextProvider]);

    useEffect(() => {
        if (!providersToLoad.length) {
            return;
        }

        let ignore = false;

        async function loadProviders() {
            for (const nextProvider of providersToLoad) {
                const providerDefinition = getProviderDefinition(nextProvider);
                const catalogFallback = getCatalogFallback(nextProvider);

                try {
                    const res = await fetch(`/api/models/${nextProvider}`, {
                        cache: "no-store",
                    });
                    const data = (await res.json().catch(() => null)) as ModelResponse | null;

                    if (ignore) {
                        return;
                    }

                    if (!res.ok || !data?.models?.length) {
                        setModelsByProvider((current) => ({
                            ...current,
                            [nextProvider]: catalogFallback,
                        }));
                        setMessagesByProvider((current) => ({
                            ...current,
                            [nextProvider]: data?.error || "Live models unavailable, showing catalog fallback.",
                        }));
                        continue;
                    }

                    setModelsByProvider((current) => ({
                        ...current,
                        [nextProvider]: data.models ?? catalogFallback,
                    }));
                    setMessagesByProvider((current) => ({
                        ...current,
                        [nextProvider]: `Live models loaded from ${providerDefinition.label}.`,
                    }));
                } catch {
                    if (ignore) {
                        return;
                    }

                    setModelsByProvider((current) => ({
                        ...current,
                        [nextProvider]: catalogFallback,
                    }));
                    setMessagesByProvider((current) => ({
                        ...current,
                        [nextProvider]: "Live models unavailable, showing catalog fallback.",
                    }));
                }
            }
        }

        void loadProviders();

        return () => {
            ignore = true;
        };
    }, [providersToLoad]);

    const models = modelsByProvider[safeProvider] ?? getCatalogFallback(safeProvider);
    const effectiveModel = models.some((option) => option.id === model)
        ? model
        : models[0]?.id ?? getDefaultModel(safeProvider);
    const modelsMessage =
        messagesByProvider[safeProvider] ?? `Using current ${getProviderDefinition(safeProvider).label} catalog.`;
    const selectedModel = models.find((option) => option.id === effectiveModel) ?? models[0] ?? getCatalogFallback(safeProvider)[0];
    const conversationGroups = buildConversationGroups(history);
    const effectiveVisibleGroupCount = conversationGroups.length
        ? Math.min(Math.max(visibleGroupCount, INITIAL_VISIBLE_GROUPS), conversationGroups.length)
        : INITIAL_VISIBLE_GROUPS;
    const visibleGroups = conversationGroups.slice(
        Math.max(0, conversationGroups.length - effectiveVisibleGroupCount)
    );
    const hiddenGroupCount = conversationGroups.length - visibleGroups.length;
    const controlsPayload = buildControlsPayload(controls);

    function updateControl(name: keyof ControlFormState, value: string) {
        setControls((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleAddTarget() {
        const fallbackProvider = availableProviders[targets.length % availableProviders.length]?.id ?? provider;
        setTargets((current) => [
            ...current,
            {
                provider: fallbackProvider,
                model: getDefaultModel(fallbackProvider),
            },
        ]);
    }

    function handleTargetProviderChange(index: number, nextProvider: SupportedProvider) {
        setTargets((current) =>
            current.map((target, currentIndex) =>
                currentIndex === index
                    ? {
                          provider: nextProvider,
                          model: getDefaultModel(nextProvider),
                      }
                    : target
            )
        );
    }

    function handleTargetModelChange(index: number, nextModel: string) {
        setTargets((current) =>
            current.map((target, currentIndex) =>
                currentIndex === index
                    ? {
                          ...target,
                          model: nextModel,
                      }
                    : target
            )
        );
    }

    function handleRemoveTarget(index: number) {
        setTargets((current) => current.filter((_, currentIndex) => currentIndex !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setCompareResults([]);

        try {
            const endpoint = mode === "compare" ? "/api/chat/compare" : "/api/chat";
            const body =
                mode === "compare"
                    ? {
                          prompt,
                          targets: normalizedTargets,
                          controls: controlsPayload,
                          memoryMode,
                      }
                    : {
                          prompt,
                          provider: safeProvider,
                          model: effectiveModel,
                          controls: controlsPayload,
                          memoryMode,
                      };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const errorMessage = data?.error || "Request failed";
                setResult({ error: errorMessage });
                setLoading(false);
                return;
            }

            if (mode === "compare") {
                setCompareResults(Array.isArray(data?.results) ? data.results : []);
                setResult(null);
            } else {
                setResult(data);
            }

            setPrompt("");
            setLoading(false);
            router.refresh();
        } catch {
            const errorMessage = mode === "compare"
                ? "Network error while calling /api/chat/compare"
                : "Network error while calling /api/chat";
            setResult({ error: errorMessage });
            setLoading(false);
        }
    }

    function handleLoadOlder() {
        setVisibleGroupCount((current) =>
            Math.min(current + GROUPS_PER_PAGE, conversationGroups.length)
        );
    }

    function handleHistoryPurged() {
        setVisibleGroupCount(INITIAL_VISIBLE_GROUPS);
        setResult(null);
        setCompareResults([]);
    }

    const compareError = mode === "compare" ? result?.error : null;

    return (
        <section className="space-y-6">
            <section className="glass-panel rounded-[30px] p-6 sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="eyebrow">Prompt playground</p>
                        <h2 className="display-font text-2xl font-semibold text-slate-950">Single runs and model comparisons</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Send one prompt to a single model or fan it out across multiple providers and compare quality, latency, token usage, formatting, tool behavior, and instruction following.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600">
                        {availableProviders.length} configured provider{availableProviders.length === 1 ? "" : "s"} ready for testing.
                    </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
                    <div className="min-w-0 space-y-4">
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-[28px] border border-slate-200/80 bg-white/78 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.06)]"
                        >
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,244,236,0.95))] p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Run mode</p>
                                            <p className="mt-1 text-sm text-slate-600">Choose between a single response flow or a side-by-side evaluation run.</p>
                                        </div>
                                        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                            {loading ? "Working..." : mode === "compare" ? "Comparison ready" : "Single run ready"}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setMode("single")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                mode === "single"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Single model</p>
                                            <p className={`mt-1 text-xs leading-5 ${mode === "single" ? "text-slate-200" : "text-slate-500"}`}>
                                                Focus on one provider/model pair with the shared controls below.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode("compare")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                mode === "compare"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Multi-model compare</p>
                                            <p className={`mt-1 text-xs leading-5 ${mode === "compare" ? "text-slate-200" : "text-slate-500"}`}>
                                                Run the same prompt across multiple models and compare outputs in one place.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Memory mode</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Shared history is the default. When you need fair experiments, switch to provider or model branches to limit what context each target can see.
                                            </p>
                                        </div>
                                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                                            {history.length} saved message{history.length === 1 ? "" : "s"}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <button
                                            type="button"
                                            onClick={() => setMemoryMode("shared")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                memoryMode === "shared"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Shared history</p>
                                            <p className={`mt-1 text-xs leading-5 ${memoryMode === "shared" ? "text-slate-200" : "text-slate-500"}`}>
                                                Uses the full saved conversation across providers by default, so the workspace behaves like one shared assistant thread.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMemoryMode("provider")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                memoryMode === "provider"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Provider branch</p>
                                            <p className={`mt-1 text-xs leading-5 ${memoryMode === "provider" ? "text-slate-200" : "text-slate-500"}`}>
                                                Filters context to prior messages associated with the same provider, which helps when comparing provider behavior more fairly.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMemoryMode("model")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                memoryMode === "model"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">Model branch</p>
                                            <p className={`mt-1 text-xs leading-5 ${memoryMode === "model" ? "text-slate-200" : "text-slate-500"}`}>
                                                Narrows memory to the exact provider/model path, which is useful for controlled model-specific experiments.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMemoryMode("stateless")}
                                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                                memoryMode === "stateless"
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">No memory / stateless</p>
                                            <p className={`mt-1 text-xs leading-5 ${memoryMode === "stateless" ? "text-slate-200" : "text-slate-500"}`}>
                                                Sends only the current prompt, which makes each run independent from prior conversation history.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {mode === "single" ? (
                                    <div className="space-y-4">
                                        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                                            <div className="space-y-2">
                                                <label htmlFor="provider" className="text-sm font-semibold text-slate-800">
                                                    Provider
                                                </label>
                                                <select
                                                    id="provider"
                                                    value={safeProvider}
                                                    onChange={(e) => setProvider(e.target.value as SupportedProvider)}
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                                >
                                                    {availableProviders.map((entry) => (
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
                                                    value={effectiveModel}
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
                                    </div>
                                ) : (
                                    <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,237,0.92))] p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Comparison targets</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">Pick two or more targets. Mix providers or compare multiple models from the same provider.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddTarget}
                                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                                            >
                                                Add target
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {normalizedTargets.map((target, index) => {
                                                const targetModels = modelsByProvider[target.provider] ?? getCatalogFallback(target.provider);
                                                const targetModel = targetModels.find((entry) => entry.id === target.model) ?? targetModels[0];

                                                return (
                                                    <div key={`${getTargetKey(target)}-${index}`} className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-white/80 p-4 lg:grid-cols-[0.7fr_1.2fr_auto] lg:items-start">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Provider</label>
                                                            <select
                                                                value={target.provider}
                                                                onChange={(e) => handleTargetProviderChange(index, e.target.value as SupportedProvider)}
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                                            >
                                                                {availableProviders.map((entry) => (
                                                                    <option key={entry.id} value={entry.id}>
                                                                        {entry.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Model</label>
                                                            <select
                                                                value={target.model}
                                                                onChange={(e) => handleTargetModelChange(index, e.target.value)}
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                                            >
                                                                {targetModels.map((option) => (
                                                                    <option key={option.id} value={option.id}>
                                                                        {option.label} - {option.availability === "free" ? "Free" : option.availability === "paid" ? "Paid" : "Check pricing"}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                                <span className="rounded-full bg-slate-100 px-3 py-1">{targetModel?.source === "live" ? "Live list" : "Catalog fallback"}</span>
                                                                <span className="rounded-full bg-slate-100 px-3 py-1">{targetModel?.availability === "free" ? "Free" : targetModel?.availability === "paid" ? "Paid" : "Pricing unknown"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end lg:pt-7">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveTarget(index)}
                                                                disabled={normalizedTargets.length <= 2}
                                                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Generation controls</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">Use the same settings across every run so you can compare behavior more fairly.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                            <span className="rounded-full bg-slate-100 px-3 py-1">temperature</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1">top_p</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1">seed</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1">reasoning / verbosity</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Temperature" help="Controls randomness. Lower values are more deterministic, while higher values allow more variation and creativity." />
                                            <input value={controls.temperature} onChange={(e) => updateControl("temperature", e.target.value)} placeholder="0.7" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Top P" help="Limits sampling to the most likely tokens whose combined probability reaches this value. Lower numbers make output more conservative." />
                                            <input value={controls.top_p} onChange={(e) => updateControl("top_p", e.target.value)} placeholder="1" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Max tokens" help="Sets the maximum number of tokens the model can generate in the response before it stops." />
                                            <input value={controls.max_tokens} onChange={(e) => updateControl("max_tokens", e.target.value)} placeholder="1024" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Seed" help="Requests repeatable sampling when the provider supports it. Using the same seed and settings can make outputs easier to compare." />
                                            <input value={controls.seed} onChange={(e) => updateControl("seed", e.target.value)} placeholder="42" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Frequency penalty" help="Discourages the model from repeating the same words or phrases too often across the response." />
                                            <input value={controls.frequency_penalty} onChange={(e) => updateControl("frequency_penalty", e.target.value)} placeholder="0" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Presence penalty" help="Encourages the model to introduce new ideas or topics instead of staying on the same wording or concepts." />
                                            <input value={controls.presence_penalty} onChange={(e) => updateControl("presence_penalty", e.target.value)} placeholder="0" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" />
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Reasoning effort" help="Asks supported providers to spend less or more effort on reasoning before answering. Higher effort can improve harder tasks but may add latency." />
                                            <select value={controls.reasoning_effort} onChange={(e) => updateControl("reasoning_effort", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                <option value="">Provider default</option>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </label>
                                        <label className="space-y-2 text-sm font-semibold text-slate-800">
                                            <ControlLabel label="Verbosity" help="Requests shorter or more detailed responses when the provider supports that setting." />
                                            <select value={controls.verbosity} onChange={(e) => updateControl("verbosity", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                <option value="">Provider default</option>
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>

                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={mode === "compare" ? "Give every model the same task so you can compare how they respond..." : "Ask for a summary, brainstorm ideas, or draft content..."}
                                    className="min-h-52 w-full rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,246,240,0.92))] px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                    required
                                />

                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                                        <span className="rounded-full bg-slate-100 px-3 py-1">Encrypted key access</span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">Prompt is cleared after success</span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">History saved automatically</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || (mode === "compare" && normalizedTargets.length < 2)}
                                        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loading ? "Running..." : mode === "compare" ? "Compare models" : "Send prompt"}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {compareError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {compareError}
                            </div>
                        ) : null}
                    </div>

                    <div className="min-w-0 rounded-[28px] border border-slate-200/80 bg-white/82 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.05)]">
                        {mode === "compare" ? (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Comparison board</p>
                                        <h3 className="display-font mt-1 text-xl font-semibold text-slate-950">Side-by-side results</h3>
                                        <p className="mt-1 text-sm text-slate-500">Review output quality, formatting, latency, token usage, tool calls, and instruction adherence in one pass.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">quality</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">latency</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">tool calls</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">style</span>
                                    </div>
                                </div>

                                {compareResults.length ? (
                                    <div className="mt-4 space-y-4">
                                        {compareResults.map((entry, index) => (
                                            <article key={`${entry.provider}-${entry.model}-${index}`} className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,244,237,0.95))]">
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{getProviderDefinition(entry.provider).label}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{getModelLabel(entry.model) || entry.model}</p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                                                        {entry.status === "success" ? "Completed" : "Failed"}
                                                    </span>
                                                </div>

                                                <div className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-3 xl:grid-cols-6">
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Latency</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">{entry.latencyMs !== null ? `${entry.latencyMs} ms` : "n/a"}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total tokens</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">{entry.usage?.total_tokens ?? "n/a"}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Prompt tokens</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">{entry.usage?.prompt_tokens ?? "n/a"}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Completion</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">{entry.usage?.completion_tokens ?? "n/a"}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tool calls</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">{entry.toolCalls}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/80 px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Review focus</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">Quality and style</p>
                                                    </div>
                                                </div>

                                                <div className="px-5 py-4">
                                                    {entry.status === "success" && entry.output ? (
                                                        <MarkdownMessage content={entry.output} />
                                                    ) : (
                                                        <p className="text-sm text-rose-700">{entry.error || "Comparison request failed."}</p>
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                                        Run a comparison to populate this board with response cards and shared metrics.
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current session</p>
                                        <h3 className="display-font mt-1 text-xl font-semibold text-slate-950">Latest reply</h3>
                                        <p className="mt-1 text-sm text-slate-500">Your newest response stays separate from the archived conversation below.</p>
                                    </div>
                                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                                        {result?.model ? getModelLabel(result.model ?? null) || "Unknown model" : "Waiting for response"}
                                    </div>
                                </div>

                                {result?.output ? (
                                    <>
                                        <div className="mt-4 min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,244,237,0.95))] p-5 text-[15px] text-slate-800">
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
                                    </>
                                ) : (
                                    <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                                        Send a prompt to see the active session response here.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-[30px] p-6 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="eyebrow">Conversation log</p>
                        <h3 className="display-font text-xl font-semibold text-slate-950">Chat history</h3>
                        <p className="mt-1 text-sm text-slate-500">All history is loaded from the database, but only the newest exchanges are rendered at first.</p>
                    </div>
                    <div className="flex flex-wrap items-start justify-end gap-3">
                        <div className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs text-slate-600">
                            {conversationGroups.length} exchange{conversationGroups.length === 1 ? "" : "s"}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHistoryMetadata((current) => !current)}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            {showHistoryMetadata ? "Hide metadata" : "Show metadata"}
                        </button>
                        <PurgeChatHistoryButton
                            disabled={!conversationGroups.length}
                            onPurged={handleHistoryPurged}
                        />
                    </div>
                </div>

                {hiddenGroupCount > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200/80 bg-white/65 px-4 py-3 text-sm text-slate-600">
                        <span>
                            Showing the newest {visibleGroups.length} of {conversationGroups.length} exchanges.
                        </span>
                        <button
                            type="button"
                            onClick={handleLoadOlder}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            Load {Math.min(GROUPS_PER_PAGE, hiddenGroupCount)} older exchange{Math.min(GROUPS_PER_PAGE, hiddenGroupCount) === 1 ? "" : "s"}
                        </button>
                    </div>
                ) : null}

                <div className="mt-4 max-h-[42rem] space-y-4 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {visibleGroups.length ? (
                        visibleGroups.map((group, index) => {
                            const absoluteIndex = conversationGroups.length - visibleGroups.length + index;

                            return (
                                <ConversationBlock
                                    key={group.id}
                                    group={group}
                                    index={absoluteIndex}
                                    showMetadata={showHistoryMetadata}
                                />
                            );
                        })
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                            No chat history yet. Send your first prompt to start building the conversation log.
                        </div>
                    )}
                </div>
            </section>
        </section>
    );
}




















