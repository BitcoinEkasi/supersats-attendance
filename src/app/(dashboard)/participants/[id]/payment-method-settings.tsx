"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentMethodSettings({
  participantId,
  paymentMethod,
  lightningAddress,
}: {
  participantId: string;
  paymentMethod: string;
  lightningAddress: string | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState(paymentMethod);
  const [address, setAddress] = useState(lightningAddress ?? "");
  const [editingAddress, setEditingAddress] = useState(!lightningAddress && paymentMethod === "LIGHTNING_ADDRESS");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const methodChanged = method !== paymentMethod;
  const addressChanged = address !== (lightningAddress ?? "");
  const isDirty = methodChanged || (method === "LIGHTNING_ADDRESS" && addressChanged);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/payment-method`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod: method, lightningAddress: address }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      setSaved(true);
      setEditingAddress(false);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment Method</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={method}
          onChange={(e) => {
            const newMethod = e.target.value;
            setMethod(newMethod);
            setSaved(false);
            if (newMethod === "LIGHTNING_ADDRESS" && !address) setEditingAddress(true);
          }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        >
          <option value="BOLT_CARD">Bolt Card</option>
          <option value="LIGHTNING_ADDRESS">Lightning Address</option>
        </select>

        {method === "LIGHTNING_ADDRESS" && (
          editingAddress ? (
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setSaved(false); }}
              placeholder="user@wallet.com"
              autoFocus
              className="flex-1 min-w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          ) : (
            <>
              <span className="font-mono text-sm text-gray-700">{address || "—"}</span>
              <button
                type="button"
                onClick={() => setEditingAddress(true)}
                className="text-xs text-orange-600 hover:underline"
              >
                Change
              </button>
            </>
          )
        )}

        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 transition-colors ${
              saved ? "bg-green-600" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
