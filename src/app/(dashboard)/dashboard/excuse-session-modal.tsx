"use client";

import { useState } from "react";
import { EXCUSED_SESSION_REASONS } from "@/lib/excused-session-reasons";
import type { TskGroupKey } from "@/lib/tsk-groups";
import type { DayEntry } from "@/lib/types/attendance-stats";

export default function ExcuseSessionModal({
  day,
  group,
  groupLabel,
  onClose,
  onSaved,
}: {
  day: DayEntry;
  group: TskGroupKey;
  groupLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = day.dayType === "excused";
  const [reason, setReason] = useState(day.excuseReason ?? "");
  const [reasonOther, setReasonOther] = useState(day.excuseReasonOther ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  async function handleSave() {
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/attendance/excused-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: day.date, group, reason, reasonOther }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to save");
      return;
    }
    onSaved();
    onClose();
  }

  async function handleRemove() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/attendance/excused-sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: day.date, group }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to remove excuse");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEditing ? "Excused Session" : "Mark as Excused"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-sm text-gray-600">
            {dateLabel} — <span className="font-medium">{groupLabel}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">— select reason —</option>
              {EXCUSED_SESSION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reason === "Other" && (
              <input
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder="Please describe…"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          {isEditing ? (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove Excuse
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isEditing ? "Save Changes" : "Mark Excused"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
