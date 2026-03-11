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
        <div className="rounded-2xl border p-6 shadow-sm space-y-4">
            <div>
                <h2 className="text-xl font-semibold">Try Groq</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Send a prompt using your saved API key.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask something..."
            className="min-h-32 w-full rounded border px-3 py-2"
            required
        />

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send prompt"}
                </button>
            </form>

            {result?.error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {result.error}
                </div>
            ) : null}

            {result?.output ? (
                <div className="space-y-3">
                    <div className="rounded border bg-gray-50 p-4 whitespace-pre-wrap">
                        {result.output}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                        {result.model ? <p>Model: {result.model}</p> : null}
                        {result.usage?.total_tokens ? (
                            <p>Total tokens: {result.usage.total_tokens}</p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}