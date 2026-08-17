"use client";

import { useState } from "react";
import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";
import { fmtDate } from "@/lib/format-date";

type Participant = {
  id: string;
  tskId: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
  tskStatus: string | null;
  weightKg: number | null;
  heightCm: number | null;
  tshirtSize: string | null;
  shoeSize: string | null;
  wetsuiteSize: string | null;
  measurementsUpdatedAt: Date | null;
};

type Row = { participantId: string; checked: boolean };

const dash = (v: string | number | null) => (v === null || v === "" ? <span className="text-gray-300">—</span> : v);

export default function BodyMeasurementsTable({ participants }: { participants: Participant[] }) {
  const [groupFilter, setGroupFilter] = useState<"all" | TskGroupKey>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>(participants.map((p) => ({ participantId: p.id, checked: true })));
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState("");

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));

  function isVisible(p: Participant) {
    if (groupFilter !== "all" && getGroupForStatus(p.tskStatus) !== groupFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${p.tskId} ${p.surname} ${p.fullNames} ${p.knownAs ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  const visibleParticipants = participants.filter(isVisible);

  function toggleAll(checked: boolean) {
    const visibleIds = new Set(visibleParticipants.map((p) => p.id));
    setRows((prev) => prev.map((r) => (visibleIds.has(r.participantId) ? { ...r, checked } : r)));
  }

  function toggleRow(participantId: string, checked: boolean) {
    setRows((prev) => prev.map((r) => (r.participantId === participantId ? { ...r, checked } : r)));
  }

  const selectedCount = rows.filter((r) => {
    const p = participantMap[r.participantId];
    return p && isVisible(p) && r.checked;
  }).length;

  async function handleExport(format: "csv" | "pdf") {
    const participantIds = rows.filter((r) => r.checked).map((r) => r.participantId);
    if (participantIds.length === 0) {
      setError("Select at least one participant to export.");
      return;
    }
    setExporting(format);
    setError("");
    const res = await fetch("/api/data-sheets/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds, format }),
    });
    if (!res.ok) {
      setError("Export failed.");
      setExporting(null);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tsk-body-measurements-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  const inputCls = "rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Group:</span>
            {(["all", ...TSK_GROUPS] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${groupFilter === g ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {g === "all" ? "All" : TSK_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{selectedCount} selected</span>
            <button onClick={() => toggleAll(true)} className="text-xs text-orange-600 hover:underline">Select all</button>
            <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:underline">Deselect all</button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or TSK ID…"
            className={`${inputCls} w-64`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting !== null}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting === "csv" ? "Exporting…" : "Export CSV"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Exporting…" : "Export PDF"}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-gray-50 px-3 py-3 w-8 border-b"></th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Participant</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Group</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Weight (kg)</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Height (cm)</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">T-Shirt Size</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Shoe Size (UK)</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Wetsuit Size</th>
              <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {visibleParticipants.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">No participants match the current filters.</td>
              </tr>
            ) : (
              visibleParticipants.map((p) => {
                const row = rows.find((r) => r.participantId === p.id)!;
                const name = `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;
                const group = getGroupForStatus(p.tskStatus);
                return (
                  <tr key={p.id} className={`border-b last:border-0 ${!row.checked ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) => toggleRow(p.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-orange-600"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{name}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.tskId}</div>
                    </td>
                    <td className="px-4 py-2">
                      {group ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                          {TSK_GROUP_LABELS[group]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{dash(p.weightKg)}</td>
                    <td className="px-4 py-2">{dash(p.heightCm)}</td>
                    <td className="px-4 py-2">{dash(p.tshirtSize)}</td>
                    <td className="px-4 py-2">{dash(p.shoeSize)}</td>
                    <td className="px-4 py-2">{dash(p.wetsuiteSize)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {p.measurementsUpdatedAt ? fmtDate(p.measurementsUpdatedAt) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
