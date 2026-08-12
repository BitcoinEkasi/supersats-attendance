"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionActivity } from "@prisma/client";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";

type FormState = {
  name: string;
  restrictedToGroup: string;
  requiresNote: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  restrictedToGroup: "",
  requiresNote: false,
};

function toForm(a: SessionActivity): FormState {
  return {
    name: a.name,
    restrictedToGroup: a.restrictedToGroup || "",
    requiresNote: a.requiresNote,
  };
}

const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
const labelCls = "block text-xs font-medium text-gray-600";

function ActivityFields({ form, onChange }: { form: FormState; onChange: (form: FormState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Activity Name *</label>
        <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Restricted to Group</label>
          <select value={form.restrictedToGroup} onChange={(e) => onChange({ ...form, restrictedToGroup: e.target.value })} className={inputCls}>
            <option value="">All groups</option>
            {TSK_GROUPS.map((g) => (
              <option key={g} value={g}>{TSK_GROUP_LABELS[g]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.requiresNote}
              onChange={(e) => onChange({ ...form, requiresNote: e.target.checked })}
            />
            Requires a note
          </label>
        </div>
      </div>
    </div>
  );
}

export default function SessionActivitiesForm({ activities }: { activities: SessionActivity[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!addForm.name.trim()) {
      setError("Activity name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/session-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setAddForm(EMPTY_FORM);
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  function startEdit(activity: SessionActivity) {
    setEditingId(activity.id);
    setEditForm(toForm(activity));
    setError("");
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) {
      setError("Activity name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/session-activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setEditingId(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this activity? Sessions already created with it keep their current value.")) return;
    await fetch(`/api/admin/session-activities/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {activities.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No session activities configured yet.</p>
      )}

      {activities.map((activity) =>
        editingId === activity.id ? (
          <div key={activity.id} className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
            <ActivityFields form={editForm} onChange={setEditForm} />
            <div className="flex gap-2">
              <button type="button" onClick={() => handleSaveEdit(activity.id)} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => { setEditingId(null); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div key={activity.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{activity.name}</p>
              <p className="text-xs text-gray-500">
                {activity.restrictedToGroup ? `${TSK_GROUP_LABELS[activity.restrictedToGroup]} only` : "All groups"}
                {activity.requiresNote && " · Requires a note"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => startEdit(activity)} className="text-xs text-orange-600 hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(activity.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                aria-label="Remove activity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )
      )}

      {adding && (
        <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
          <ActivityFields form={addForm} onChange={setAddForm} />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Activity"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setAddForm(EMPTY_FORM); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && !editingId && (
        <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600">
          + Add Activity
        </button>
      )}
    </div>
  );
}
