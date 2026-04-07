"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Participant = {
  id: string;
  tskId: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
  boltUserId: string | null;
  paymentMethod: string;
  lightningAddress: string | null;
};

type Row = {
  participantId: string;
  checked: boolean;
  amountSats: string;
  note: string;
};

export default function SpecialPayoutForm({ participants }: { participants: Participant[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [defaultNote, setDefaultNote] = useState("");
  const [filter, setFilter] = useState<"all" | "BOLT_CARD" | "LIGHTNING_ADDRESS">("all");
  const [rows, setRows] = useState<Row[]>(
    participants.map((p) => ({ participantId: p.id, checked: true, amountSats: "", note: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));

  function applyDefaults() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        amountSats: defaultAmount || r.amountSats,
        note: defaultNote || r.note,
      }))
    );
  }

  function setRow(participantId: string, field: keyof Row, value: string | boolean) {
    setRows((prev) =>
      prev.map((r) => (r.participantId === participantId ? { ...r, [field]: value } : r))
    );
  }

  function toggleAll(checked: boolean) {
    const visibleIds = new Set(
      participants
        .filter((p) => filter === "all" || p.paymentMethod === filter)
        .map((p) => p.id)
    );
    setRows((prev) => prev.map((r) => (visibleIds.has(r.participantId) ? { ...r, checked } : r)));
  }

  const visibleParticipants = participants.filter(
    (p) => filter === "all" || p.paymentMethod === filter
  );

  const selectedCount = rows.filter((r) => {
    const p = participantMap[r.participantId];
    if (!p) return false;
    if (filter !== "all" && p.paymentMethod !== filter) return false;
    return r.checked;
  }).length;

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    const entries = rows
      .filter((r) => r.checked && parseInt(r.amountSats) > 0)
      .map((r) => ({ participantId: r.participantId, amountSats: parseInt(r.amountSats), note: r.note || undefined }));

    if (entries.length === 0) { setError("Select at least one participant with a positive amount"); return; }

    setLoading(true);
    setError("");
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), entries }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/payouts/${data.id}`);
  }

  const inputCls = "rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none";

  return (
    <div className="mt-6 space-y-4">
      {/* Title */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium text-gray-700">Payout Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Competition bonus, End of year reward"
          className={`mt-1 w-full ${inputCls}`}
        />
      </div>

      {/* Defaults */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Default values — apply to all selected rows</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600">Default Amount (sats)</label>
            <input
              type="number"
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(e.target.value)}
              min={1}
              placeholder="e.g. 5000"
              className={`mt-1 w-36 ${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600">Default Note</label>
            <input
              type="text"
              value={defaultNote}
              onChange={(e) => setDefaultNote(e.target.value)}
              placeholder="Reason for payout"
              className={`mt-1 w-full ${inputCls}`}
            />
          </div>
          <button
            onClick={applyDefaults}
            className="rounded-md bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Apply to all
          </button>
        </div>
      </div>

      {/* Participant table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {(["all", "BOLT_CARD", "LIGHTNING_ADDRESS"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {f === "all" ? "All" : f === "BOLT_CARD" ? "Bolt Card" : "Lightning"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{selectedCount} selected</span>
            <button onClick={() => toggleAll(true)} className="text-xs text-orange-600 hover:underline">Select all</button>
            <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-8"></th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Participant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Payment</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Amount (sats)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
            </tr>
          </thead>
          <tbody>
            {visibleParticipants.map((p) => {
              const row = rows.find((r) => r.participantId === p.id)!;
              const name = `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;
              const paymentId = p.paymentMethod === "LIGHTNING_ADDRESS"
                ? (p.lightningAddress ?? "No LN address set")
                : p.boltUserId ? "Bolt Card" : "No Bolt account";
              return (
                <tr key={p.id} className={`border-b last:border-0 ${!row.checked ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.checked}
                      onChange={(e) => setRow(p.id, "checked", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-gray-400 font-mono">{p.tskId}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.paymentMethod === "LIGHTNING_ADDRESS"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {p.paymentMethod === "LIGHTNING_ADDRESS" ? "⚡ LN" : "💳 Card"}
                    </span>
                    <div className="mt-0.5 text-xs text-gray-500 max-w-36 truncate">{paymentId}</div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={row.amountSats}
                      onChange={(e) => setRow(p.id, "amountSats", e.target.value)}
                      min={1}
                      placeholder="sats"
                      className={`w-28 ${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.note}
                      onChange={(e) => setRow(p.id, "note", e.target.value)}
                      placeholder="Optional note"
                      className={`w-48 ${inputCls}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push("/payouts")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Payout"}
        </button>
      </div>
    </div>
  );
}
