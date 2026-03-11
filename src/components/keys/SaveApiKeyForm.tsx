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
            <div>
                <label className="mb-2 block text-sm font-medium">
                    Groq API key
                </label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full rounded border px-3 py-2"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
                {loading ? "Saving..." : "Save or replace key"}
            </button>

            {message ? <p className="text-sm">{message}</p> : null}
        </form>
    );
}