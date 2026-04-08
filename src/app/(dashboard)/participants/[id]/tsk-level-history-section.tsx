"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format-date";
import { TSK_LEVELS, TSK_LEVEL_MAP } from "@/lib/tsk-levels";

type HistoryEntry = { id: string; level: string; changedAt: string | Date };

function formatLevelDuration(from: Date, to: Date): string {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 1) return "< 1 month";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [
    y > 0 ? `${y} yr${y > 1 ? "s" : ""}` : "",
    m > 0 ? `${m} mo` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function levelColor(level: string): string {
  if (level.startsWith("Turtle")) return "bg-orange-400";
  if (level.startsWith("Seal")) return "bg-green-500";
  if (level.startsWith("Dolphin")) return "bg-blue-500";
  return "bg-gray-400";
}

export default function TskLevelHistorySection({
  participantId,
  history,
}: {
  participantId: string;
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newLevel, setNewLevel] = useState("");
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
  const now = new Date();

  async function handleAdd() {
    if (!newLevel || !newDate) { setError("Level and date are required"); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/tsk-level-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: newLevel, changedAt: newDate }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    setShowAdd(false);
    setNewLevel("");
    setNewDate("");
    router.refresh();
  }

  async function handleDelete(historyId: string) {
    setDeletingId(historyId);
    await fetch(`/api/participants/${participantId}/tsk-level-history`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId }),
    });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">TSK Level Progression</h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Add entry
          </button>
        )}
      </div>

      {sorted.length === 0 && !showAdd && (
        <p className="mt-4 text-sm text-gray-400">No level history recorded yet.</p>
      )}

      {sorted.length > 0 && (
        <ol className="mt-4 space-y-0">
          {sorted.map((entry, idx) => {
            const from = new Date(entry.changedAt);
            const to = idx < sorted.length - 1 ? new Date(sorted[idx + 1].changedAt) : now;
            const isLast = idx === sorted.length - 1;
            const duration = formatLevelDuration(from, to);

            return (
              <li key={entry.id} className="flex items-start gap-3">
                {/* Timeline spine */}
                <div className="flex flex-col items-center">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${levelColor(entry.level)}`} />
                  {!isLast && <span className="mt-1 w-0.5 flex-1 bg-gray-200" style={{ minHeight: "2rem" }} />}
                </div>

                {/* Content */}
                <div className="flex flex-1 items-start justify-between pb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{entry.level}</p>
                    {TSK_LEVEL_MAP[entry.level as keyof typeof TSK_LEVEL_MAP] && (
                      <p className="text-xs italic text-gray-400">{TSK_LEVEL_MAP[entry.level as keyof typeof TSK_LEVEL_MAP]}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fmtDate(from)}
                      {" → "}
                      {isLast ? "present" : fmtDate(to)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {duration}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      aria-label="Delete entry"
                      className="flex h-5 w-5 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {showAdd && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">Level</label>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">— select —</option>
              {TSK_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Date achieved</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(""); }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
