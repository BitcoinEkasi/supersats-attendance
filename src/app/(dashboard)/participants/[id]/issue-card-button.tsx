"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IssueCardButton({ participantId }: { participantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardId.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/participants/${participantId}/bolt-card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: cardId.trim() }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to issue card");
      return;
    }

    setOpen(false);
    setCardId("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
      >
        Issue Card
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        placeholder="Card ID"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <button
        type="submit"
        disabled={loading || !cardId.trim()}
        className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? "Issuing…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null); setCardId(""); }}
        className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
