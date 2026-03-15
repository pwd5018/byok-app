"use client";

import { useMemo, useState } from "react";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import { buildStructuredJsonDiff, buildTextDiff, compareResponseMetrics } from "@/lib/responseDiffs";
import { getModelLabel, getProviderDefinition, type SupportedProvider } from "@/lib/modelCatalog";

type DiffableResult = {
    provider: SupportedProvider;
    model: string;
    output: string;
    latencyMs: number | null;
    totalTokens: number | null;
};

type ComparisonDiffExplorerProps = {
    results: DiffableResult[];
};

type ViewMode = "text" | "json" | "markdown" | "metrics";

function getResultLabel(result: DiffableResult) {
    return `${getProviderDefinition(result.provider).label} - ${getModelLabel(result.model) || result.model}`;
}

export default function ComparisonDiffExplorer({ results }: ComparisonDiffExplorerProps) {
    const [leftIndex, setLeftIndex] = useState(0);
    const [rightIndex, setRightIndex] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>("text");

    const safeLeftIndex = Math.min(leftIndex, Math.max(results.length - 1, 0));
    const safeRightIndex = Math.min(rightIndex, Math.max(results.length - 1, 0));
    const left = results[safeLeftIndex];
    const right = results[safeRightIndex];

    const textDiff = useMemo(() => buildTextDiff(left.output, right.output), [left.output, right.output]);
    const jsonDiff = useMemo(() => buildStructuredJsonDiff(left.output, right.output), [left.output, right.output]);
    const metrics = useMemo(
        () =>
            compareResponseMetrics({
                leftTokens: left.totalTokens,
                rightTokens: right.totalTokens,
                leftLatency: left.latencyMs,
                rightLatency: right.latencyMs,
            }),
        [left.latencyMs, left.totalTokens, right.latencyMs, right.totalTokens]
    );

    return (
        <section className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Diff explorer</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-950">Inspect two responses</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {([
                        ["text", "Text diff"],
                        ["json", "Structured JSON diff"],
                        ["markdown", "Markdown vs raw"],
                        ["metrics", "Tokens and latency"],
                    ] as const).map(([mode, label]) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setViewMode(mode)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                viewMode === mode
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-800">
                    <span>Left response</span>
                    <select
                        value={safeLeftIndex}
                        onChange={(event) => setLeftIndex(Number(event.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    >
                        {results.map((result, index) => (
                            <option key={`${result.provider}-${result.model}-${index}`} value={index}>
                                {getResultLabel(result)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-800">
                    <span>Right response</span>
                    <select
                        value={safeRightIndex}
                        onChange={(event) => setRightIndex(Number(event.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    >
                        {results.map((result, index) => (
                            <option key={`${result.provider}-${result.model}-${index}`} value={index}>
                                {getResultLabel(result)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {viewMode === "text" ? (
                <div className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100">
                    {textDiff.map((line, index) => (
                        <div
                            key={`${line.type}-${index}`}
                            className={`grid gap-3 rounded-lg px-3 py-2 md:grid-cols-2 ${
                                line.type === "same"
                                    ? "bg-slate-900/70"
                                    : line.type === "remove"
                                        ? "bg-rose-950/60"
                                        : "bg-emerald-950/60"
                            }`}
                        >
                            <span>{line.left ?? ""}</span>
                            <span>{line.right ?? ""}</span>
                        </div>
                    ))}
                </div>
            ) : null}

            {viewMode === "json" ? (
                jsonDiff ? (
                    <div className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100">
                        {jsonDiff.diff.map((line, index) => (
                            <div
                                key={`${line.type}-${index}`}
                                className={`grid gap-3 rounded-lg px-3 py-2 md:grid-cols-2 ${
                                    line.type === "same"
                                        ? "bg-slate-900/70"
                                        : line.type === "remove"
                                            ? "bg-rose-950/60"
                                            : "bg-emerald-950/60"
                                }`}
                            >
                                <span>{line.left ?? ""}</span>
                                <span>{line.right ?? ""}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                        Both responses need valid JSON for the structured diff view.
                    </div>
                )
            ) : null}

            {viewMode === "markdown" ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    {[left, right].map((result) => (
                        <div key={`${result.provider}-${result.model}`} className="space-y-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,244,236,0.92))] p-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{getResultLabel(result)}</p>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rendered markdown</p>
                                    <div className="mt-3 text-sm text-slate-800">
                                        <MarkdownMessage content={result.output} />
                                    </div>
                                </div>
                                <div className="rounded-[18px] border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Raw text</p>
                                    <pre className="mt-3 whitespace-pre-wrap break-words">{result.output}</pre>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {viewMode === "metrics" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Token totals</p>
                        <p className="mt-2 text-sm text-slate-700">Left: {metrics.leftTokens ?? "n/a"}</p>
                        <p className="mt-1 text-sm text-slate-700">Right: {metrics.rightTokens ?? "n/a"}</p>
                        <p className="mt-3 text-sm font-semibold text-slate-900">Delta: {metrics.tokenDelta ?? "n/a"}</p>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Latency</p>
                        <p className="mt-2 text-sm text-slate-700">Left: {metrics.leftLatency !== null ? `${metrics.leftLatency} ms` : "n/a"}</p>
                        <p className="mt-1 text-sm text-slate-700">Right: {metrics.rightLatency !== null ? `${metrics.rightLatency} ms` : "n/a"}</p>
                        <p className="mt-3 text-sm font-semibold text-slate-900">Delta: {metrics.latencyDelta !== null ? `${metrics.latencyDelta} ms` : "n/a"}</p>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selection</p>
                        <p className="mt-2 text-sm text-slate-700">Left: {getResultLabel(left)}</p>
                        <p className="mt-1 text-sm text-slate-700">Right: {getResultLabel(right)}</p>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
