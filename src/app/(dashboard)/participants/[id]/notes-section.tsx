"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotesSection({
  participantId,
  initialNotes,
}: {
  participantId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-orange-600 hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add any notes about this participant…"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setValue(initialNotes || ""); setEditing(false); }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{value}</p>
      ) : (
        <p className="mt-3 text-sm text-gray-400">No notes yet.</p>
      )}
    </div>
  );
}
