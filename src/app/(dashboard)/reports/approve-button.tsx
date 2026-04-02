"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveButton({ reportId, disabled = false }: { reportId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    if (!confirm("Approve this report? This confirms that the month's results have been reviewed and are correct.")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/reports/${reportId}/approve`, { method: "POST" });
    const result = await res.json();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleApprove}
        disabled={loading || disabled}
        title={disabled ? "Month is not yet complete" : undefined}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Approving..." : "Approve Report"}
      </button>
    </div>
  );
}
