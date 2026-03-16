"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PromptVersionControls from "@/components/chat/chat-form/PromptVersionControls";
import ResultsPane from "@/components/chat/chat-form/ResultsPane";
import HistoryPane from "@/components/chat/chat-form/HistoryPane";
import {
    DEFAULT_CHAT_PROVIDER,
    PROVIDERS,
    getDefaultModel,
    getProviderDefinition,
    type SupportedProvider,
} from "@/lib/modelCatalog";
import { PROMPT_VERSION_TYPES, type PromptVersionType } from "@/lib/promptVersions";
import {
    type ModelRatingSummary,
    type ResponseRatingField,
    type ResponseScores,
} from "@/lib/responseRatings";
import {
    buildControlsPayload,
    buildConversationGroups,
    DEFAULT_SYSTEM_PROMPT,
    EMPTY_CONTROLS,
    getCatalogFallback,
    getInitialTargets,
    getTargetKey,
    GROUPS_PER_PAGE,
    INITIAL_VISIBLE_GROUPS,
} from "@/components/chat/chat-form/utils";
import type {
    ChatFormProps,
    ComparisonTarget,
    CompareResult,
    ControlFormState,
    FormMode,
    MemoryMode,
    ModelResponse,
    PromptVersionRecord,
} from "@/components/chat/chat-form/types";

function createEmptyScores(): ResponseScores {
    return {
        correctness: null,
        usefulness: null,
        style: null,
        instructionFollowing: null,
        safety: null,
        conciseness: null,
    };
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
export default function ChatForm({ history, configuredProviders }: ChatFormProps) {
    const router = useRouter();
    const availableProviders = useMemo(
        () => PROVIDERS.filter((entry) => configuredProviders.includes(entry.id)),
        [configuredProviders]
    );
    const initialProvider = availableProviders[0]?.id ?? DEFAULT_CHAT_PROVIDER;

    const [mode, setMode] = useState<FormMode>("single");
    const [provider, setProvider] = useState<SupportedProvider>(initialProvider);
    const [model, setModel] = useState(getDefaultModel(initialProvider));
    const [singlePrompt, setSinglePrompt] = useState("");
    const [comparePrompt, setComparePrompt] = useState("");
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [developerPrompt, setDeveloperPrompt] = useState("");
    const [controls, setControls] = useState<ControlFormState>(EMPTY_CONTROLS);
    const [memoryMode, setMemoryMode] = useState<MemoryMode>("shared");
    const [result, setResult] = useState<import("@/components/chat/chat-form/types").ChatResult | null>(null);
    const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
    const [showHistoryMetadata, setShowHistoryMetadata] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visibleGroupCount, setVisibleGroupCount] = useState(INITIAL_VISIBLE_GROUPS);
    const [showPromptTemplates, setShowPromptTemplates] = useState(false);
    const [showGenerationControls, setShowGenerationControls] = useState(false);
    const [targets, setTargets] = useState<ComparisonTarget[]>(getInitialTargets(availableProviders.map((entry) => entry.id)));
    const [modelsByProvider, setModelsByProvider] = useState<Record<string, NonNullable<ModelResponse["models"]>>>({
        [initialProvider]: getCatalogFallback(initialProvider),
    });
    const [messagesByProvider, setMessagesByProvider] = useState<Record<string, string>>({
        [initialProvider]: `Using current ${getProviderDefinition(initialProvider).label} catalog.`,
    });
    const [promptVersions, setPromptVersions] = useState<PromptVersionRecord[]>([]);
    const [selectedPromptVersionIds, setSelectedPromptVersionIds] = useState<Record<PromptVersionType, string>>({
        system: "",
        developer: "",
        user: "",
        template: "",
    });
    const [promptVersionNames, setPromptVersionNames] = useState<Record<PromptVersionType, string>>({
        system: "",
        developer: "",
        user: "",
        template: "",
    });
    const [promptLibraryMessage, setPromptLibraryMessage] = useState<string | null>(null);
    const [ratingsByMessageId, setRatingsByMessageId] = useState<Record<string, ResponseScores>>({});
    const [savingRatings, setSavingRatings] = useState<Record<string, boolean>>({});
    const [ratingSummary, setRatingSummary] = useState<ModelRatingSummary[]>([]);

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

    useEffect(() => {
        let ignore = false;

        async function loadPromptVersions() {
            try {
                const res = await fetch("/api/prompts", { cache: "no-store" });
                const data = await res.json().catch(() => null);

                if (!ignore && res.ok) {
                    setPromptVersions(Array.isArray(data?.versions) ? data.versions : []);
                }
            } catch {
                if (!ignore) {
                    setPromptLibraryMessage("Could not load saved prompt versions.");
                }
            }
        }

        async function loadRatingSummary() {
            try {
                const res = await fetch("/api/chat/ratings", { cache: "no-store" });
                const data = await res.json().catch(() => null);

                if (!ignore && res.ok) {
                    setRatingSummary(Array.isArray(data?.summary) ? data.summary : []);
                }
            } catch {
                if (!ignore) {
                    setRatingSummary([]);
                }
            }
        }

        void Promise.all([loadPromptVersions(), loadRatingSummary()]);

        return () => {
            ignore = true;
        };
    }, []);

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
    const compareError = mode === "compare" ? result?.error ?? null : null;
    const promptVersionsByType = useMemo(
        () =>
            Object.fromEntries(
                PROMPT_VERSION_TYPES.map((type) => [
                    type,
                    promptVersions.filter((version) => version.type === type),
                ])
            ) as Record<PromptVersionType, PromptVersionRecord[]>,
        [promptVersions]
    );

    function updateControl(name: keyof ControlFormState, value: string) {
        setControls((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function setPromptVersionName(type: PromptVersionType, value: string) {
        setPromptVersionNames((current) => ({
            ...current,
            [type]: value,
        }));
    }

    function setSelectedPromptVersionId(type: PromptVersionType, value: string) {
        setSelectedPromptVersionIds((current) => ({
            ...current,
            [type]: value,
        }));
    }

    function applyPromptVersion(type: PromptVersionType, insertOnly = false) {
        const version = promptVersions.find((entry) => entry.id === selectedPromptVersionIds[type]);

        if (!version) {
            return;
        }

        if (type === "system") {
            setSystemPrompt(version.content);
        } else if (type === "developer") {
            setDeveloperPrompt(version.content);
        } else if (type === "user") {
            if (mode === "compare") {
                setComparePrompt(version.content);
            } else {
                setSinglePrompt(version.content);
            }
        } else if (mode === "compare") {
            setComparePrompt((current) => {
                if (!insertOnly || !current.trim()) {
                    return version.content;
                }

                return `${current.trim()}\n\n${version.content}`;
            });
        } else {
            setSinglePrompt((current) => {
                if (!insertOnly || !current.trim()) {
                    return version.content;
                }

                return `${current.trim()}\n\n${version.content}`;
            });
        }

        setPromptLibraryMessage(`${version.name} loaded.`);
    }

    async function refreshPromptVersions() {
        const res = await fetch("/api/prompts", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        setPromptVersions(Array.isArray(data?.versions) ? data.versions : []);
    }

    async function refreshRatingSummary() {
        const res = await fetch("/api/chat/ratings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        setRatingSummary(Array.isArray(data?.summary) ? data.summary : []);
    }

    async function handleSavePromptVersion(type: PromptVersionType) {
        const content = type === "system" ? systemPrompt : type === "developer" ? developerPrompt : mode === "compare" ? comparePrompt : singlePrompt;

        if (!content.trim()) {
            setPromptLibraryMessage(`Add some ${type} content before saving.`);
            return;
        }

        const res = await fetch("/api/prompts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type,
                name: promptVersionNames[type],
                content,
            }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            setPromptLibraryMessage(data?.error || "Could not save prompt version.");
            return;
        }

        setPromptLibraryMessage(`${data?.version?.name || type} saved.`);
        setPromptVersionName(type, "");
        setSelectedPromptVersionId(type, data?.version?.id || "");
        await refreshPromptVersions();
    }

    async function handleDeletePromptVersion(type: PromptVersionType) {
        const id = selectedPromptVersionIds[type];

        if (!id) {
            return;
        }

        const res = await fetch(`/api/prompts?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            setPromptLibraryMessage(data?.error || "Could not delete prompt version.");
            return;
        }

        setPromptLibraryMessage(`${type} deleted.`);
        setSelectedPromptVersionId(type, "");
        await refreshPromptVersions();
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

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        setResult(null);
        setCompareResults([]);

        try {
            const endpoint = mode === "compare" ? "/api/chat/compare" : "/api/chat";
            const body =
                mode === "compare"
                    ? {
                          prompt: comparePrompt,
                          systemPrompt,
                          developerPrompt,
                          targets: normalizedTargets,
                          controls: controlsPayload,
                          memoryMode,
                      }
                    : {
                          prompt: singlePrompt,
                          systemPrompt,
                          developerPrompt,
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

            if (mode === "compare") {
                setComparePrompt("");
            } else {
                setSinglePrompt("");
            }
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

    function handleRatingChange(messageId: string, field: ResponseRatingField, value: number) {
        setRatingsByMessageId((current) => ({
            ...current,
            [messageId]: {
                ...(current[messageId] ?? createEmptyScores()),
                [field]: value,
            },
        }));
    }

    async function handleSaveRating(messageId: string) {
        const scores = ratingsByMessageId[messageId];

        if (!scores) {
            return;
        }

        setSavingRatings((current) => ({
            ...current,
            [messageId]: true,
        }));

        try {
            const res = await fetch("/api/chat/ratings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatMessageId: messageId,
                    scores,
                }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setPromptLibraryMessage(data?.error || "Could not save ratings.");
                return;
            }

            setPromptLibraryMessage("Ratings saved.");
            await refreshRatingSummary();
        } finally {
            setSavingRatings((current) => ({
                ...current,
                [messageId]: false,
            }));
        }
    }

    const currentSingleScores = result?.messageId
        ? ratingsByMessageId[result.messageId] ?? createEmptyScores()
        : createEmptyScores();

    return (
        <section className="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="eyebrow">Prompt playground</p>
                    <h2 className="display-font text-2xl font-semibold text-slate-950">Single runs and model comparisons</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Save prompt variants, compare multiple models, rate outputs across six dimensions, and inspect response diffs without leaving the workspace.
                    </p>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_32px_rgba(20,33,61,0.06)] ring-1 ring-slate-200/70">
                    {availableProviders.length} configured provider{availableProviders.length === 1 ? "" : "s"} ready for testing.
                </div>
            </div>

            <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.08fr_0.96fr_0.82fr] xl:items-stretch">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] bg-[rgba(255,251,245,0.74)] shadow-[0_20px_60px_rgba(20,33,61,0.08)] ring-1 ring-slate-200/70 backdrop-blur-[14px]">
                    <div className="border-b border-slate-200/80 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt composer</p>
                        <p className="mt-1 text-sm text-slate-600">Build reusable prompts, tune execution settings, and launch runs without leaving this pane.</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-4 [scrollbar-gutter:stable]">
                        <div className="min-w-0 space-y-4">
                            <form
                                onSubmit={handleSubmit}
                                className="rounded-[28px] border border-slate-200/80 bg-white/78 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.06)]"
                            >
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,244,236,0.95))] p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt mode</p>
                                                <p className="mt-1 text-sm text-slate-600">Switch between a single-run workflow and a comparison workflow with separate prompt state.</p>
                                            </div>
                                            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                                {loading ? "Working..." : mode === "compare" ? "Comparison ready" : "Single run ready"}
                                            </div>
                                        </div>

                                        <div className="rounded-[22px] bg-slate-100 p-1">
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMode("single")}
                                                    className={mode === "single" ? "rounded-[18px] bg-white px-4 py-3 text-left text-slate-950 shadow-[0_8px_24px_rgba(20,33,61,0.08)]" : "rounded-[18px] px-4 py-3 text-left text-slate-600 transition hover:bg-white/70 hover:text-slate-900"}
                                                >
                                                    <p className="text-sm font-semibold">Single prompt</p>
                                                    <p className="mt-1 text-xs leading-5">One provider and model with its own prompt input.</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMode("compare")}
                                                    className={mode === "compare" ? "rounded-[18px] bg-white px-4 py-3 text-left text-slate-950 shadow-[0_8px_24px_rgba(20,33,61,0.08)]" : "rounded-[18px] px-4 py-3 text-left text-slate-600 transition hover:bg-white/70 hover:text-slate-900"}
                                                >
                                                    <p className="text-sm font-semibold">Comparison prompt</p>
                                                    <p className="mt-1 text-xs leading-5">Multiple targets with a dedicated comparison prompt.</p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowPromptTemplates((current) => !current)}
                                            className="flex w-full items-center justify-between gap-3 text-left"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Prompt templates and instructions</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">Open system, developer, user, and reusable template presets only when you need to manage them.</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                                {showPromptTemplates ? "Hide" : "Show"}
                                            </span>
                                        </button>

                                        {showPromptTemplates ? (
                                            <div className="mt-4 space-y-4">
                                                <PromptVersionControls
                                                    type="system"
                                                    selectedId={selectedPromptVersionIds.system}
                                                    name={promptVersionNames.system}
                                                    versions={promptVersionsByType.system}
                                                    onSelectedIdChange={(value) => setSelectedPromptVersionId("system", value)}
                                                    onNameChange={(value) => setPromptVersionName("system", value)}
                                                    onApply={() => applyPromptVersion("system")}
                                                    onSave={() => void handleSavePromptVersion("system")}
                                                    onDelete={() => void handleDeletePromptVersion("system")}
                                                />

                                                <textarea
                                                    value={systemPrompt}
                                                    onChange={(event) => setSystemPrompt(event.target.value)}
                                                    placeholder="Define the assistant's standing behavior, tone, and boundaries..."
                                                    className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                                />

                                                <PromptVersionControls
                                                    type="developer"
                                                    selectedId={selectedPromptVersionIds.developer}
                                                    name={promptVersionNames.developer}
                                                    versions={promptVersionsByType.developer}
                                                    onSelectedIdChange={(value) => setSelectedPromptVersionId("developer", value)}
                                                    onNameChange={(value) => setPromptVersionName("developer", value)}
                                                    onApply={() => applyPromptVersion("developer")}
                                                    onSave={() => void handleSavePromptVersion("developer")}
                                                    onDelete={() => void handleDeletePromptVersion("developer")}
                                                />

                                                <textarea
                                                    value={developerPrompt}
                                                    onChange={(event) => setDeveloperPrompt(event.target.value)}
                                                    placeholder="Add developer-level instructions such as output format, guardrails, or evaluation criteria..."
                                                    className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                                                />

                                                <PromptVersionControls
                                                    type="user"
                                                    selectedId={selectedPromptVersionIds.user}
                                                    name={promptVersionNames.user}
                                                    versions={promptVersionsByType.user}
                                                    onSelectedIdChange={(value) => setSelectedPromptVersionId("user", value)}
                                                    onNameChange={(value) => setPromptVersionName("user", value)}
                                                    onApply={() => applyPromptVersion("user")}
                                                    onSave={() => void handleSavePromptVersion("user")}
                                                    onDelete={() => void handleDeletePromptVersion("user")}
                                                />

                                                <PromptVersionControls
                                                    type="template"
                                                    selectedId={selectedPromptVersionIds.template}
                                                    name={promptVersionNames.template}
                                                    versions={promptVersionsByType.template}
                                                    onSelectedIdChange={(value) => setSelectedPromptVersionId("template", value)}
                                                    onNameChange={(value) => setPromptVersionName("template", value)}
                                                    onApply={() => applyPromptVersion("template", true)}
                                                    onSave={() => void handleSavePromptVersion("template")}
                                                    onDelete={() => void handleDeletePromptVersion("template")}
                                                    applyLabel="Insert"
                                                />
                                            </div>
                                        ) : null}
                                    </div>

                                    {promptLibraryMessage ? (
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                            {promptLibraryMessage}
                                        </div>
                                    ) : null}

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
                                            <button type="button" onClick={() => setMemoryMode("shared")} className={`rounded-[22px] border px-4 py-4 text-left transition ${memoryMode === "shared" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}>
                                                <p className="text-sm font-semibold">Shared history</p>
                                                <p className={`mt-1 text-xs leading-5 ${memoryMode === "shared" ? "text-slate-200" : "text-slate-500"}`}>Uses the full saved conversation across providers by default, so the workspace behaves like one shared assistant thread.</p>
                                            </button>
                                            <button type="button" onClick={() => setMemoryMode("provider")} className={`rounded-[22px] border px-4 py-4 text-left transition ${memoryMode === "provider" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}>
                                                <p className="text-sm font-semibold">Provider branch</p>
                                                <p className={`mt-1 text-xs leading-5 ${memoryMode === "provider" ? "text-slate-200" : "text-slate-500"}`}>Filters context to prior messages associated with the same provider, which helps when comparing provider behavior more fairly.</p>
                                            </button>
                                            <button type="button" onClick={() => setMemoryMode("model")} className={`rounded-[22px] border px-4 py-4 text-left transition ${memoryMode === "model" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}>
                                                <p className="text-sm font-semibold">Model branch</p>
                                                <p className={`mt-1 text-xs leading-5 ${memoryMode === "model" ? "text-slate-200" : "text-slate-500"}`}>Narrows memory to the exact provider/model path, which is useful for controlled model-specific experiments.</p>
                                            </button>
                                            <button type="button" onClick={() => setMemoryMode("stateless")} className={`rounded-[22px] border px-4 py-4 text-left transition ${memoryMode === "stateless" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}>
                                                <p className="text-sm font-semibold">No memory / stateless</p>
                                                <p className={`mt-1 text-xs leading-5 ${memoryMode === "stateless" ? "text-slate-200" : "text-slate-500"}`}>Sends only the current prompt, which makes each run independent from prior conversation history.</p>
                                            </button>
                                        </div>
                                    </div>

                                    {mode === "single" ? (
                                        <div className="space-y-4">
                                            <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                                                <div className="space-y-2">
                                                    <label htmlFor="provider" className="text-sm font-semibold text-slate-800">Provider</label>
                                                    <select id="provider" value={safeProvider} onChange={(e) => setProvider(e.target.value as SupportedProvider)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                        {availableProviders.map((entry) => (
                                                            <option key={entry.id} value={entry.id}>{entry.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="model" className="text-sm font-semibold text-slate-800">Model</label>
                                                    <select id="model" value={effectiveModel} onChange={(e) => setModel(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                        {models.map((option) => (
                                                            <option key={option.id} value={option.id}>{option.label} - {option.availability === "free" ? "Free" : option.availability === "paid" ? "Paid" : "Check pricing"}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,244,236,0.95))] p-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">{selectedModel.label}</span>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedModel.availability === "free" ? "bg-emerald-100 text-emerald-800" : selectedModel.availability === "paid" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{selectedModel.availability === "free" ? "Free plan" : selectedModel.availability === "paid" ? "Paid" : "Pricing unknown"}</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedModel.stage === "production" ? "Production" : "Preview"}</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedModel.contextWindow} context</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedModel.source === "live" ? "Live list" : "Catalog fallback"}</span>
                                                </div>

                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-slate-900">Input:</span> {selectedModel.inputPrice}</div>
                                                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-slate-900">Output:</span> {selectedModel.outputPrice}</div>
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
                                                <button type="button" onClick={handleAddTarget} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">Add target</button>
                                            </div>

                                            <div className="space-y-3">
                                                {normalizedTargets.map((target, index) => {
                                                    const targetModels = modelsByProvider[target.provider] ?? getCatalogFallback(target.provider);
                                                    const targetModel = targetModels.find((entry) => entry.id === target.model) ?? targetModels[0];

                                                    return (
                                                        <div key={`${getTargetKey(target)}-${index}`} className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-white/80 p-4 lg:grid-cols-[0.7fr_1.2fr_auto] lg:items-start">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Provider</label>
                                                                <select value={target.provider} onChange={(e) => handleTargetProviderChange(index, e.target.value as SupportedProvider)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                                    {availableProviders.map((entry) => (
                                                                        <option key={entry.id} value={entry.id}>{entry.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Model</label>
                                                                <select value={target.model} onChange={(e) => handleTargetModelChange(index, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100">
                                                                    {targetModels.map((option) => (
                                                                        <option key={option.id} value={option.id}>{option.label} - {option.availability === "free" ? "Free" : option.availability === "paid" ? "Paid" : "Check pricing"}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                                    <span className="rounded-full bg-slate-100 px-3 py-1">{targetModel?.source === "live" ? "Live list" : "Catalog fallback"}</span>
                                                                    <span className="rounded-full bg-slate-100 px-3 py-1">{targetModel?.availability === "free" ? "Free" : targetModel?.availability === "paid" ? "Paid" : "Pricing unknown"}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end lg:pt-7">
                                                                <button type="button" onClick={() => handleRemoveTarget(index)} disabled={normalizedTargets.length <= 2} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Remove</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                                        <button type="button" onClick={() => setShowGenerationControls((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Generation controls</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">Open advanced tuning only when you want to adjust temperature, token limits, or reasoning settings.</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{showGenerationControls ? "Hide" : "Show"}</span>
                                        </button>

                                        {showGenerationControls ? (
                                            <>
                                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1">temperature</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1">top_p</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1">seed</span>
                                                    <span className="rounded-full bg-slate-100 px-3 py-1">reasoning / verbosity</span>
                                                </div>

                                                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Temperature" help="Controls randomness. Lower values are more deterministic, while higher values allow more variation and creativity." /><input value={controls.temperature} onChange={(e) => updateControl("temperature", e.target.value)} placeholder="0.7" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Top P" help="Limits sampling to the most likely tokens whose combined probability reaches this value. Lower numbers make output more conservative." /><input value={controls.top_p} onChange={(e) => updateControl("top_p", e.target.value)} placeholder="1" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Max tokens" help="Sets the maximum number of tokens the model can generate in the response before it stops." /><input value={controls.max_tokens} onChange={(e) => updateControl("max_tokens", e.target.value)} placeholder="1024" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Seed" help="Requests repeatable sampling when the provider supports it. Using the same seed and settings can make outputs easier to compare." /><input value={controls.seed} onChange={(e) => updateControl("seed", e.target.value)} placeholder="42" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Frequency penalty" help="Discourages the model from repeating the same words or phrases too often across the response." /><input value={controls.frequency_penalty} onChange={(e) => updateControl("frequency_penalty", e.target.value)} placeholder="0" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Presence penalty" help="Encourages the model to introduce new ideas or topics instead of staying on the same wording or concepts." /><input value={controls.presence_penalty} onChange={(e) => updateControl("presence_penalty", e.target.value)} placeholder="0" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" /></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Reasoning effort" help="Asks supported providers to spend less or more effort on reasoning before answering. Higher effort can improve harder tasks but may add latency." /><select value={controls.reasoning_effort} onChange={(e) => updateControl("reasoning_effort", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"><option value="">Provider default</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                                                    <label className="space-y-2 text-sm font-semibold text-slate-800"><ControlLabel label="Verbosity" help="Requests shorter or more detailed responses when the provider supports that setting." /><select value={controls.verbosity} onChange={(e) => updateControl("verbosity", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"><option value="">Provider default</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>

                                    <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,246,240,0.92))] p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{mode === "compare" ? "Comparison prompt" : "Single prompt"}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">{mode === "compare" ? "This prompt is used across every selected comparison target." : "This prompt is used only for the selected provider/model pair."}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{mode === "compare" ? "Compare tab" : "Single tab"}</span>
                                        </div>

                                        <textarea value={mode === "compare" ? comparePrompt : singlePrompt} onChange={(e) => mode === "compare" ? setComparePrompt(e.target.value) : setSinglePrompt(e.target.value)} placeholder={mode === "compare" ? "Give every model the same task so you can compare how they respond..." : "Ask for a summary, brainstorm ideas, or draft content..."} className="mt-4 min-h-52 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100" required />
                                    </div>

                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                                            <span className="rounded-full bg-slate-100 px-3 py-1">Encrypted key access</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1">Prompt versions reusable</span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1">History saved automatically</span>
                                        </div>
                                        <button type="submit" disabled={loading || (mode === "compare" && normalizedTargets.length < 2) || (mode === "compare" ? !comparePrompt.trim() : !singlePrompt.trim())} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Running..." : mode === "compare" ? "Compare models" : "Send prompt"}</button>
                                    </div>
                                </div>
                            </form>

                            {compareError ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{compareError}</div>
                            ) : null}
                        </div>
                    </div>
                </section>

                <ResultsPane
                    mode={mode}
                    result={result}
                    compareResults={compareResults}
                    ratingSummary={ratingSummary}
                    ratingsByMessageId={ratingsByMessageId}
                    savingRatings={savingRatings}
                    currentSingleScores={currentSingleScores}
                    onRatingChange={handleRatingChange}
                    onSaveRating={handleSaveRating}
                />

                <HistoryPane
                    conversationGroups={conversationGroups}
                    visibleGroups={visibleGroups}
                    hiddenGroupCount={hiddenGroupCount}
                    showHistoryMetadata={showHistoryMetadata}
                    onToggleMetadata={() => setShowHistoryMetadata((current) => !current)}
                    onLoadOlder={handleLoadOlder}
                    onHistoryPurged={handleHistoryPurged}
                />
            </div>
        </section>
    );
}



