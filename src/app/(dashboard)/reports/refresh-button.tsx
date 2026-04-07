"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({ refreshUrl }: { refreshUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRefresh() {
    setLoading(true);
    setError("");
    const res = await fetch(refreshUrl, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        title="Re-calculate from latest data"
        className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? "Refreshing…" : "Refresh Report"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
