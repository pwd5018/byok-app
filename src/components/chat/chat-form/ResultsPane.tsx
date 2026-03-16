import MarkdownMessage from "@/components/chat/MarkdownMessage";
import ComparisonDiffExplorer from "@/components/chat/ComparisonDiffExplorer";
import ResponseRatingPanel from "@/components/chat/ResponseRatingPanel";
import {
    RESPONSE_RATING_FIELDS,
    type ModelRatingSummary,
    type ResponseRatingField,
    type ResponseScores,
} from "@/lib/responseRatings";
import {
    getModelLabel,
    getProviderDefinition,
    isSupportedProvider,
} from "@/lib/modelCatalog";
import type { ChatResult, CompareResult, FormMode } from "./types";

function createEmptyScores() {
    return {
        correctness: null,
        usefulness: null,
        style: null,
        instructionFollowing: null,
        safety: null,
        conciseness: null,
    } as ResponseScores;
}

type ResultsPaneProps = {
    mode: FormMode;
    result: ChatResult | null;
    compareResults: CompareResult[];
    ratingSummary: ModelRatingSummary[];
    ratingsByMessageId: Record<string, ResponseScores>;
    savingRatings: Record<string, boolean>;
    currentSingleScores: ResponseScores;
    onRatingChange: (messageId: string, field: ResponseRatingField, value: number) => void;
    onSaveRating: (messageId: string) => void | Promise<void>;
};

export default function ResultsPane({
    mode,
    result,
    compareResults,
    ratingSummary,
    ratingsByMessageId,
    savingRatings,
    currentSingleScores,
    onRatingChange,
    onSaveRating,
}: ResultsPaneProps) {
    const successfulCompareResults = compareResults.filter(
        (entry): entry is CompareResult & { output: string } => entry.status === "success" && typeof entry.output === "string"
    );

    return (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] bg-[rgba(255,251,245,0.78)] shadow-[0_20px_60px_rgba(20,33,61,0.08)] ring-1 ring-slate-200/70 backdrop-blur-[14px]">
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-4 [scrollbar-gutter:stable]">
                <div className="min-w-0 rounded-[28px] bg-white/82 p-5 shadow-[0_16px_40px_rgba(20,33,61,0.05)] ring-1 ring-slate-200/80">
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

                            {ratingSummary.length ? (
                                <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(249,244,236,0.92))] p-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model rating summary</p>
                                        <p className="mt-1 text-sm text-slate-600">Simple averages across saved model evaluations.</p>
                                    </div>
                                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                                        {ratingSummary.map((entry) => (
                                            <article key={entry.modelKey} className="rounded-[20px] border border-slate-200 bg-white/80 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{entry.provider && isSupportedProvider(entry.provider) ? getProviderDefinition(entry.provider).label : "Unknown provider"}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{getModelLabel(entry.model) || entry.model || "Unknown model"}</p>
                                                    </div>
                                                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{entry.overallAverage ?? "n/a"}</div>
                                                </div>
                                                <p className="mt-3 text-xs text-slate-500">{entry.sampleCount} rated response{entry.sampleCount === 1 ? "" : "s"}</p>
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    {RESPONSE_RATING_FIELDS.map((field) => (
                                                        <div key={field} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                                            <span className="font-semibold text-slate-900">{field}:</span> {entry.averages[field] ?? "n/a"}
                                                        </div>
                                                    ))}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

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

                                            <div className="space-y-4 px-5 py-4">
                                                {entry.status === "success" && entry.output ? (
                                                    <>
                                                        <MarkdownMessage content={entry.output} />
                                                        <ResponseRatingPanel
                                                            messageId={entry.messageId}
                                                            scores={entry.messageId ? ratingsByMessageId[entry.messageId] ?? createEmptyScores() : createEmptyScores()}
                                                            saving={Boolean(entry.messageId && savingRatings[entry.messageId])}
                                                            onChange={(field, value) => entry.messageId && onRatingChange(entry.messageId, field, value)}
                                                            onSave={() => entry.messageId && void onSaveRating(entry.messageId)}
                                                        />
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-rose-700">{entry.error || "Comparison request failed."}</p>
                                                )}
                                            </div>
                                        </article>
                                    ))}

                                    {successfulCompareResults.length >= 2 ? (
                                        <ComparisonDiffExplorer
                                            results={successfulCompareResults.map((entry) => ({
                                                provider: entry.provider,
                                                model: entry.model,
                                                output: entry.output,
                                                latencyMs: entry.latencyMs,
                                                totalTokens: entry.usage?.total_tokens ?? null,
                                            }))}
                                        />
                                    ) : null}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                                    Run a comparison to populate this board with response cards, ratings, summaries, and diff tools.
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

                                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
                                        <div className="section-card p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latency</p>
                                            <p className="mt-2 text-sm font-medium text-slate-900">{result.latencyMs !== null && result.latencyMs !== undefined ? `${result.latencyMs} ms` : "n/a"}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <ResponseRatingPanel
                                            messageId={result.messageId}
                                            scores={currentSingleScores}
                                            saving={Boolean(result.messageId && savingRatings[result.messageId])}
                                            onChange={(field, value) => result.messageId && onRatingChange(result.messageId, field, value)}
                                            onSave={() => result.messageId && void onSaveRating(result.messageId)}
                                        />
                                    </div>
                                </>
                            ) : result?.error ? (
                                <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                                    {result.error}
                                </div>
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
    );
}
