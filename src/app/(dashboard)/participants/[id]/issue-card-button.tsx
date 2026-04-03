"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IssueCardButton({ participantId }: { participantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/participants/${participantId}/bolt-card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to issue card");
      return;
    }

    const { boltUserId, boltPublicUrl } = await res.json();
    router.refresh();

    // Open the participant's bolt admin page
    if (boltUserId && boltPublicUrl) {
      window.open(`${boltPublicUrl}/admin/users/${boltUserId}`, '_blank');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? "Issuing…" : "Issue Card"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
