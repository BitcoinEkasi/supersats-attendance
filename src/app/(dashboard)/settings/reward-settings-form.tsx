"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildTiers } from "@/lib/rewards";

type HistoryRow = {
  id: string;
  minSats: number;
  maxSats: number;
  effectiveFrom: string;
  createdBy: string;
};

export default function RewardSettingsForm({
  currentMinSats,
  currentMaxSats,
  history,
}: {
  currentMinSats: number;
  currentMaxSats: number;
  history: HistoryRow[];
}) {
  const router = useRouter();
  const [minSats, setMinSats] = useState(String(currentMinSats));
  const [maxSats, setMaxSats] = useState(String(currentMaxSats));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const min = parseInt(minSats) || 0;
  const max = parseInt(maxSats) || 0;
  const previewTiers = min > 0 && max > min ? buildTiers(min, max) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/admin/reward-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minSats: min, maxSats: max }),
    });
    const result = await res.json();
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        {saved && <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">Reward settings updated — effective immediately for all new reports.</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Sats (at 70%)</label>
            <input
              type="number"
              min={1}
              value={minSats}
              onChange={(e) => { setMinSats(e.target.value); setSaved(false); }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Sats (at 100%)</label>
            <input
              type="number"
              min={1}
              value={maxSats}
              onChange={(e) => { setMaxSats(e.target.value); setSaved(false); }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Live tier preview */}
        {previewTiers && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tier Preview</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {previewTiers.filter(t => t.sats > 0).reverse().map((t) => (
                <div key={t.label} className="text-center">
                  <p className={`text-sm font-bold ${t.color}`}>{t.sats.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !previewTiers}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Apply New Settings"}
        </button>
      </form>

      {/* History */}
      {history.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Change History</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-1">Effective From</th>
                <th className="pb-1">Min Sats</th>
                <th className="pb-1">Max Sats</th>
                <th className="pb-1">By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} className={`border-b ${i === 0 ? "font-medium" : "text-gray-500"}`}>
                  <td className="py-1.5">{new Date(h.effectiveFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-1.5">{h.minSats.toLocaleString()}</td>
                  <td className="py-1.5">{h.maxSats.toLocaleString()}</td>
                  <td className="py-1.5 text-xs">{h.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
