"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyApiKeyButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleVerify() {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/keys/groq/verify", {
                method: "POST",
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Verification failed");
                setLoading(false);
                router.refresh();
                return;
            }

            setMessage("Groq API key is valid.");
            setLoading(false);
            router.refresh();
        } catch {
            setMessage("Network error while verifying key");
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="rounded border px-4 py-2 disabled:opacity-50"
            >
                {loading ? "Verifying..." : "Verify saved key"}
            </button>

            {message ? <p className="text-sm">{message}</p> : null}
        </div>
    );
}