"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Recipient = { id: string; email: string };

export default function EmailRecipientsForm({ recipients }: { recipients: Recipient[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/email-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setEmail("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/email-recipients/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  return (
    <div className="space-y-3">
      {recipients.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No recipients configured — falling back to the ATTENDANCE_ALERT_RECIPIENTS env var, if set.</p>
      )}

      {recipients.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
          <p className="text-sm text-gray-700">{r.email}</p>
          <button
            type="button"
            onClick={() => handleDelete(r.id)}
            className="ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            aria-label="Remove recipient"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}

      {adding && (
        <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. coach@bitcoinekasi.com"
              className={inputCls}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Recipient"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600">
          + Add Recipient
        </button>
      )}
    </div>
  );
}
