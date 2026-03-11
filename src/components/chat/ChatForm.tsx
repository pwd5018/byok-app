"use client";

import { useState } from "react";

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

export default function ChatForm() {
    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState<ChatResult | null>(null);
    const [loading, setLoading] = useState(false);

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
                body: JSON.stringify({ prompt }),
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
            setLoading(false);
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
                    <h2 className="display-font text-2xl font-semibold text-slate-950">Try Groq with your saved key</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Send a prompt through the app using the encrypted key already attached to your account.
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600">
                    Responses appear below with model and token details when available.
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask for a summary, brainstorm ideas, or draft content..."
                    className="min-h-40 w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    required
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600">Keep prompts specific to get better answers and cleaner token usage.</p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Sending..." : "Send prompt"}
                    </button>
                </div>
            </form>

            {result?.error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {result.error}
                </div>
            ) : null}

            {result?.output ? (
                <div className="mt-6 space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-white/85 p-5 text-[15px] leading-7 whitespace-pre-wrap text-slate-800">
                        {result.output}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="section-card p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">{result.model || "Unknown"}</p>
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
        </section>
    );
}
