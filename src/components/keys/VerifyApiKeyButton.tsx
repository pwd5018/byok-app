"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getProviderDefinition, type SupportedProvider } from "@/lib/modelCatalog";

type VerifyApiKeyButtonProps = {
    provider: SupportedProvider;
};

export default function VerifyApiKeyButton({ provider }: VerifyApiKeyButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const providerDefinition = getProviderDefinition(provider);

    async function handleVerify() {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`/api/keys/${provider}/verify`, {
                method: "POST",
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Verification failed");
                setLoading(false);
                router.refresh();
                return;
            }

            setMessage(`${providerDefinition.label} API key is valid.`);
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
                className="rounded-full border border-slate-300 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Verifying..." : `Verify ${providerDefinition.label} key`}
            </button>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
    );
}
