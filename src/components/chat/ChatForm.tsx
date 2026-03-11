"use client";

import { useRouter } from "next/navigation";
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

export default function ChatForm({ history }: ChatFormProps) {
    const router = useRouter();
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
                    <h2 className="display-font text-2xl font-semibold text-slate-950">Try Groq with your saved key</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Send a prompt through the app using the encrypted key already attached to your account.
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
                                    <p className="mt-1 text-sm text-slate-600">Draft the next prompt and send it with your saved key.</p>
                                </div>
                                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                    {loading ? "Working..." : "Ready"}
                                </div>
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
                                    {result.model || "Unknown model"}
                                </div>
                            </div>

                            <div className="mt-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,244,237,0.95))] p-5 text-[15px] leading-7 whitespace-pre-wrap text-slate-800">
                                {result.output}
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

                    <div className="mt-4 max-h-[42rem] space-y-3 overflow-y-auto pr-1">
                        {history.length ? (
                            history.map((message) => {
                                const isUser = message.role === "user";

                                return (
                                    <article
                                        key={message.id}
                                        className={`rounded-[24px] border px-5 py-4 transition ${
                                            isUser
                                                ? "ml-6 border-amber-200 bg-[linear-gradient(180deg,rgba(255,245,225,0.98),rgba(255,238,207,0.95))]"
                                                : "mr-6 border-slate-200 bg-white/92"
                                        }`}
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
                                                    <span className="text-xs text-slate-500">{message.model}</span>
                                                ) : null}
                                            </div>
                                            <span className="text-xs text-slate-500">{formatTimestamp(message.createdAt)}</span>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                                            {message.content}
                                        </p>
                                    </article>
                                );
                            })
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
