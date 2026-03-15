"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PurgeChatHistoryButtonProps = {
    disabled?: boolean;
    onPurged?: () => void;
};

export default function PurgeChatHistoryButton({
    disabled = false,
    onPurged,
}: PurgeChatHistoryButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleDelete() {
        const confirmed = window.confirm(
            "Delete all saved chat history for this account? This cannot be undone."
        );

        if (!confirmed) return;

        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/chat/history", {
                method: "DELETE",
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setMessage(data?.error || "Failed to delete chat history");
                setLoading(false);
                return;
            }

            setMessage("Chat history deleted.");
            setLoading(false);
            onPurged?.();
            router.refresh();
        } catch {
            setMessage("Network error while deleting chat history");
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleDelete}
                disabled={disabled || loading}
                className="rounded-full border border-rose-200 bg-rose-50/80 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Deleting..." : "Purge chat history"}
            </button>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
    );
}
