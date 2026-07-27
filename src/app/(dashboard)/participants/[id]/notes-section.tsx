"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantNote } from "@prisma/client";
import { fmtDate } from "@/lib/format-date";

export default function NotesSection({
  participantId,
  notes,
}: {
  participantId: string;
  notes: ParticipantNote[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleAdd() {
    if (!text.trim()) {
      setError("Note text is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setText("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  function startEdit(n: ParticipantNote) {
    setEditingId(n.id);
    setEditText(n.text);
    setEditError("");
  }

  async function handleSaveEdit(noteId: string) {
    if (!editText.trim()) {
      setEditError("Note text is required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/participants/${participantId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      setEditError(data.error);
    } else {
      setEditingId(null);
      router.refresh();
    }
    setEditSaving(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
      <div className="mt-3 space-y-3">
        {notes.length === 0 && !adding && (
          <p className="text-sm text-gray-400">No notes yet.</p>
        )}

        {notes.map((n) => {
          const isEditing = editingId === n.id;
          return (
            <div key={n.id} className="rounded-md border border-gray-200 px-3 py-2">
              {isEditing ? (
                <div className="space-y-2">
                  {editError && <p className="text-xs text-red-500">{editError}</p>}
                  <textarea
                    rows={4}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(n.id)}
                      disabled={editSaving}
                      className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      {editSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400">{fmtDate(new Date(n.createdAt))}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(n)}
                    className="ml-4 shrink-0 text-xs text-orange-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {adding && (
          <div className="space-y-2 rounded-md border border-orange-200 bg-orange-50 p-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a note about this participant…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Note"}
              </button>
              <button
                type="button"
                onClick={() => { setText(""); setError(""); setAdding(false); }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600"
          >
            + Add Note
          </button>
        )}
      </div>
    </div>
  );
}
