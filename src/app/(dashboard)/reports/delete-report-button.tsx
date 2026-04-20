"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId, month, group }: { reportId: string; month: string; group?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete report");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-gray-600">Delete {group ? `${group} – ` : ""}{month}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(null); }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-red-500 hover:text-red-700"
    >
      Delete
    </button>
  );
}
