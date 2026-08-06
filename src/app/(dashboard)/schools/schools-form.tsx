"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { School } from "@prisma/client";

type FormState = {
  name: string;
  location: string;
  principalName: string;
  principalContact: string;
  principalEmail: string;
  secretaryName: string;
  secretaryContact: string;
  secretaryEmail: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  location: "",
  principalName: "",
  principalContact: "",
  principalEmail: "",
  secretaryName: "",
  secretaryContact: "",
  secretaryEmail: "",
};

function toForm(s: School): FormState {
  return {
    name: s.name,
    location: s.location || "",
    principalName: s.principalName || "",
    principalContact: s.principalContact || "",
    principalEmail: s.principalEmail || "",
    secretaryName: s.secretaryName || "",
    secretaryContact: s.secretaryContact || "",
    secretaryEmail: s.secretaryEmail || "",
  };
}

const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
const labelCls = "block text-xs font-medium text-gray-600";

function SchoolFields({ form, onChange }: { form: FormState; onChange: (form: FormState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>School Name *</label>
        <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>School Location</label>
        <input value={form.location} onChange={(e) => onChange({ ...form, location: e.target.value })} className={inputCls} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Principal — Name & Surname</label>
          <input value={form.principalName} onChange={(e) => onChange({ ...form, principalName: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Principal — Contact Number</label>
          <input value={form.principalContact} onChange={(e) => onChange({ ...form, principalContact: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Principal — Email</label>
          <input type="email" value={form.principalEmail} onChange={(e) => onChange({ ...form, principalEmail: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Secretary — Name & Surname</label>
          <input value={form.secretaryName} onChange={(e) => onChange({ ...form, secretaryName: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Secretary — Contact Number</label>
          <input value={form.secretaryContact} onChange={(e) => onChange({ ...form, secretaryContact: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Secretary — Email</label>
          <input type="email" value={form.secretaryEmail} onChange={(e) => onChange({ ...form, secretaryEmail: e.target.value })} className={inputCls} />
        </div>
      </div>
    </div>
  );
}

export default function SchoolsForm({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!addForm.name.trim()) {
      setError("School name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/schools", {
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

  function startEdit(school: School) {
    setEditingId(school.id);
    setEditForm(toForm(school));
    setError("");
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) {
      setError("School name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/schools/${id}`, {
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
    if (!window.confirm("Remove this school? Participants already linked to it keep their current value.")) return;
    await fetch(`/api/admin/schools/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {schools.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No schools configured yet.</p>
      )}

      {schools.map((school) =>
        editingId === school.id ? (
          <div key={school.id} className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
            <SchoolFields form={editForm} onChange={setEditForm} />
            <div className="flex gap-2">
              <button type="button" onClick={() => handleSaveEdit(school.id)} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => { setEditingId(null); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div key={school.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{school.name}</p>
              {school.location && <p className="text-xs text-gray-500">{school.location}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => startEdit(school)} className="text-xs text-orange-600 hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(school.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                aria-label="Remove school"
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
          <SchoolFields form={addForm} onChange={setAddForm} />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save School"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setAddForm(EMPTY_FORM); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && !editingId && (
        <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600">
          + Add School
        </button>
      )}
    </div>
  );
}
