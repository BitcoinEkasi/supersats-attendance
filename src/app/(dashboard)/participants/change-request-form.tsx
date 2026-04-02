"use client";

import { useState } from "react";

export default function ChangeRequestForm({ participantId }: { participantId: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/change-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const result = await res.json();
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setNotes("");
      setOpen(false);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        Change request submitted. An administrator will review it.
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
        >
          Request Change
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700">Describe the change needed</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              placeholder="e.g. Suspend this participant — inactive since March"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {loading ? "Submitting..." : "Submit Request"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
