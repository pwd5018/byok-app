"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteApiKeyButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete your saved Groq API key? This cannot be undone."
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/keys/groq", {
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
        className="rounded border px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete saved key"}
      </button>

      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}