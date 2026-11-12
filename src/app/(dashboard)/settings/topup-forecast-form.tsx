"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GroupForecast = {
  group: string;
  label: string;
  participants: number;
  remainingSessions: number;
  currentlyQualifying: number;
  canReach100: number;
  currentSats: number;
  forecastSats: number;
  estimated: boolean;
};

type Forecast = {
  month: string;
  maxRemaining: number;
  groups: GroupForecast[];
  forecastSats: number;
  contingencyPercent: number;
  withContingencySats: number;
  reserveSats: number | null;
  topupSats: number;
};

const inputCls =
  "w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const fmt = (n: number) => n.toLocaleString("en-ZA");

export default function TopupForecastForm({
  enabled: initialEnabled,
  remainingSessions: initialRemaining,
  contingencyPercent: initialContingency,
  topupAddress: initialAddress,
  lastSentMonth,
}: {
  enabled: boolean;
  remainingSessions: number;
  contingencyPercent: number;
  topupAddress: string;
  lastSentMonth: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [remaining, setRemaining] = useState(String(initialRemaining));
  const [contingency, setContingency] = useState(String(initialContingency));
  const [address, setAddress] = useState(initialAddress);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<{ forecast: Forecast; subject: string } | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/topup-forecast-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, remainingSessions: Number(remaining), contingencyPercent: Number(contingency), topupAddress: address }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) setMessage({ kind: "error", text: data.error });
    else {
      setMessage({ kind: "ok", text: "Top-up request settings saved." });
      setPreview(null);
      router.refresh();
    }
  }

  async function runPreview() {
    setBusy("preview");
    setMessage(null);
    const res = await fetch("/api/admin/topup-forecast");
    const data = await res.json();
    setBusy(null);
    if (data.error) setMessage({ kind: "error", text: data.error });
    else setPreview(data);
  }

  async function sendNow() {
    if (!confirm("Send this month's top-up request email to the recipients now? It won't be sent again automatically this month.")) return;
    setBusy("send");
    setMessage(null);
    const res = await fetch("/api/admin/check-topup-forecast?force=1", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (data.error) setMessage({ kind: "error", text: data.error });
    else if (data.skipped) setMessage({ kind: "error", text: `Not sent: ${data.skipped}` });
    else {
      setMessage({ kind: "ok", text: `Sent "${data.subject}" to ${data.recipients} recipient(s).` });
      setPreview({ forecast: data.forecast, subject: data.subject });
      router.refresh();
    }
  }

  const f = preview?.forecast;

  return (
    <div className="space-y-4">
      {message && (
        <div className={`rounded border p-2 text-sm ${message.kind === "ok" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={save} className="space-y-3 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-orange-600" />
          Send a monthly top-up request
        </label>
        <div className="flex items-center gap-2">
          Check <input type="number" min={1} max={20} value={remaining} onChange={(e) => setRemaining(e.target.value)} className={inputCls} /> remaining sessions
        </div>
        <div className="flex items-center gap-2">
          Calc forecast at max with <input type="number" min={0} max={100} value={contingency} onChange={(e) => setContingency(e.target.value)} className={inputCls} />% contingency
        </div>
        <div className="flex items-center gap-2">
          Top up to Lightning address
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      <p className="text-xs text-gray-500">
        {lastSentMonth ? `Last sent for ${lastSentMonth}.` : "Not sent yet."} Sent once a month, from 08:00 SAST on the first day with that many sessions or fewer left.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "preview" ? "Calculating…" : "Preview this month"}
        </button>
        <button
          type="button"
          onClick={sendNow}
          disabled={busy !== null}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : "Send now"}
        </button>
      </div>

      {f && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
          <p className="mb-2 font-medium text-gray-900">{preview!.subject}</p>
          <p className="mb-3 text-gray-600">{f.maxRemaining} session{f.maxRemaining === 1 ? "" : "s"} left this month.</p>
          <table className="mb-3">
            <tbody>
              <tr><td className="pr-6 text-gray-600">Forecast at max</td><td className="text-right">{fmt(f.forecastSats)} sats</td></tr>
              <tr><td className="pr-6 text-gray-600">Plus {f.contingencyPercent}% contingency</td><td className="text-right">{fmt(f.withContingencySats)} sats</td></tr>
              <tr><td className="pr-6 text-gray-600">Current reserve</td><td className="text-right">{f.reserveSats === null ? "unavailable" : `${fmt(f.reserveSats)} sats`}</td></tr>
              <tr className="font-semibold"><td className="pr-6">Top-up needed</td><td className="text-right text-orange-600">{fmt(f.topupSats)} sats</td></tr>
            </tbody>
          </table>
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left font-medium">Group</th>
                <th className="text-right font-medium">People</th>
                <th className="text-right font-medium">Left</th>
                <th className="text-right font-medium">70%+ now</th>
                <th className="text-right font-medium">Can hit 100%</th>
                <th className="text-right font-medium">If paid today</th>
                <th className="text-right font-medium">Forecast</th>
              </tr>
            </thead>
            <tbody>
              {f.groups.map((g) => (
                <tr key={g.group} className="border-t border-gray-200">
                  <td>{g.label}{g.estimated ? " *" : ""}</td>
                  <td className="text-right">{g.participants}</td>
                  <td className="text-right">{g.remainingSessions}</td>
                  <td className="text-right">{g.currentlyQualifying}</td>
                  <td className="text-right">{g.canReach100}</td>
                  <td className="text-right">{fmt(g.currentSats)}</td>
                  <td className="text-right">{fmt(g.forecastSats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {f.groups.some((g) => g.estimated) && (
            <p className="mt-2 text-xs text-gray-500">* No session captured yet this month: every active participant counted at the maximum reward.</p>
          )}
        </div>
      )}
    </div>
  );
}
