"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getProviderDefinition, type SupportedProvider } from "@/lib/modelCatalog";

type DeleteApiKeyButtonProps = {
    provider: SupportedProvider;
};

export default function DeleteApiKeyButton({ provider }: DeleteApiKeyButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const providerDefinition = getProviderDefinition(provider);

    async function handleDelete() {
        const confirmed = window.confirm(
            `Delete your saved ${providerDefinition.label} API key? This cannot be undone.`
        );

        if (!confirmed) return;

        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`/api/keys/${provider}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Failed to delete API key");
                setLoading(false);
                return;
            }

            setMessage("API key deleted.");
            setLoading(false);
            router.refresh();
        } catch {
            setMessage("Network error while deleting key");
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-full border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Deleting..." : "Delete saved key"}
            </button>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
    );
}
