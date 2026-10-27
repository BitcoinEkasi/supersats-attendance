"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GROUP_PENALTY_OPTIONS } from "@/lib/rewards";

export default function PenaltyButton({
  reportId,
  currentPercent,
  currentReason,
}: {
  reportId: string;
  currentPercent: number;
  currentReason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState<number>(currentPercent || GROUP_PENALTY_OPTIONS[0]);
  const [reason, setReason] = useState(currentReason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasPenalty = currentPercent > 0;

  async function submit(method: "PUT" | "DELETE") {
    const message = method === "PUT"
      ? `Slash every reward in this group by ${percent}%?`
      : "Remove the group penalty and restore full rewards?";
    if (!confirm(message)) return;

    setLoading(true);
    setError("");
    const res = await fetch(`/api/reports/${reportId}/penalty`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PUT" ? JSON.stringify({ percent, reason }) : undefined,
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        {hasPenalty ? `Penalty −${currentPercent}%` : "Group Penalty"}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-gray-900">Slash this group&apos;s rewards</p>
          <p className="mt-0.5 text-xs text-gray-500">Applies to every participant in this report until it is approved.</p>

          <div className="mt-3 flex gap-2">
            {GROUP_PENALTY_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-center text-sm font-medium ${
                  percent === opt ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input type="radio" name="penalty" value={opt} checked={percent === opt} onChange={() => setPercent(opt)} className="sr-only" />
                −{opt}%
              </label>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Reason (required) — e.g. late to sessions, equipment not cared for"
            className="mt-3 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-red-400 focus:outline-none"
          />

          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            {hasPenalty ? (
              <button
                onClick={() => submit("DELETE")}
                disabled={loading}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
              >
                Remove penalty
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={() => submit("PUT")}
                disabled={loading || !reason.trim()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Saving…" : hasPenalty ? "Update" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
