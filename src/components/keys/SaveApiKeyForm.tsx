"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SaveApiKeyForm() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/keys/groq", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ apiKey }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Failed to save API key");
                setLoading(false);
                router.refresh();
                return;
            }

            setMessage("Groq API key saved and verified.");
            setApiKey("");
            setLoading(false);
            router.refresh();
        } catch {
            setMessage("Network error while saving key");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Groq API key</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    required
                />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">We validate the key immediately before saving it to your account.</p>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Saving..." : "Save and verify"}
                </button>
            </div>

            {message ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {message}
                </p>
            ) : null}
        </form>
    );
}
