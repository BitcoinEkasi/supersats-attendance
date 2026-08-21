"use client";

import { Fragment, useRef, useState } from "react";
import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";

export type SchoolReportEntry = {
  year: number;
  term1Result: number | null;
  term1FileUrl: string | null;
  term2Result: number | null;
  term2FileUrl: string | null;
  term3Result: number | null;
  term3FileUrl: string | null;
  term4Result: number | null;
  term4FileUrl: string | null;
};

export type Participant = {
  id: string;
  tskId: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
  tskStatus: string | null;
  schoolReports: SchoolReportEntry[];
};

type Row = { participantId: string; checked: boolean };

const QUARTERS = [
  { key: "term1", label: "Q1" },
  { key: "term2", label: "Q2" },
  { key: "term3", label: "Q3" },
  { key: "term4", label: "Q4" },
] as const;

type TermKey = (typeof QUARTERS)[number]["key"];
type ResultField = `${TermKey}Result`;
type FileField = `${TermKey}FileUrl`;

function emptyTerms(): Omit<SchoolReportEntry, "year"> {
  return {
    term1Result: null, term1FileUrl: null,
    term2Result: null, term2FileUrl: null,
    term3Result: null, term3FileUrl: null,
    term4Result: null, term4FileUrl: null,
  };
}

function seedState(participants: Participant[]): Record<string, Record<number, Omit<SchoolReportEntry, "year">>> {
  const initial: Record<string, Record<number, Omit<SchoolReportEntry, "year">>> = {};
  for (const p of participants) {
    initial[p.id] = {};
    for (const r of p.schoolReports) {
      const { year, ...terms } = r;
      initial[p.id][year] = terms;
    }
  }
  return initial;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear + 1 - 2020 + 1 }, (_, i) => 2020 + i).reverse();

export default function SchoolReportsTable({ participants }: { participants: Participant[] }) {
  const [groupFilter, setGroupFilter] = useState<"all" | TskGroupKey>("all");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<Row[]>(participants.map((p) => ({ participantId: p.id, checked: true })));
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Set<string>>(new Set());

  const [reportState, setReportState] = useState(() => seedState(participants));
  const lastSaved = useRef(seedState(participants));

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

  function getTerms(participantId: string): Omit<SchoolReportEntry, "year"> {
    return reportState[participantId]?.[year] ?? emptyTerms();
  }

  function updateTermField(participantId: string, field: ResultField | FileField, value: number | string | null) {
    setReportState((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [year]: { ...(prev[participantId]?.[year] ?? emptyTerms()), [field]: value },
      },
    }));
  }

  async function saveTermField(participantId: string, field: ResultField | FileField, overrideValue?: number | string | null) {
    const current = getTerms(participantId);
    const value = overrideValue !== undefined ? overrideValue : current[field];
    const lastVal = lastSaved.current[participantId]?.[year]?.[field] ?? null;
    if (value === lastVal) return;

    const res = await fetch(`/api/participants/${participantId}/school-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, [field]: value }),
    });
    if (!res.ok) return;

    lastSaved.current[participantId] = {
      ...(lastSaved.current[participantId] ?? {}),
      [year]: { ...(lastSaved.current[participantId]?.[year] ?? emptyTerms()), [field]: value },
    };
  }

  function onEnterBlur(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  async function handleFileUpload(participantId: string, termKey: TermKey, file: File) {
    const cellId = `${participantId}-${termKey}`;
    setUploading((prev) => new Set(prev).add(cellId));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading((prev) => {
      const next = new Set(prev);
      next.delete(cellId);
      return next;
    });
    if (data.path) {
      const field: FileField = `${termKey}FileUrl`;
      updateTermField(participantId, field, data.path);
      await saveTermField(participantId, field, data.path);
    } else if (data.error) {
      setError(data.error);
    }
  }

  function handleFileRemove(participantId: string, termKey: TermKey) {
    const field: FileField = `${termKey}FileUrl`;
    updateTermField(participantId, field, null);
    saveTermField(participantId, field, null);
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
    const res = await fetch("/api/data-sheets/school-reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds, format, year }),
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
    a.download = `tsk-school-reports-${year}-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  const inputCls = "rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none";
  const cellInputCls = "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-gray-200 focus:border-orange-400 focus:bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
            <span className="ml-2 text-sm font-medium text-gray-700">Year:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
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
              {QUARTERS.map((q) => (
                <th key={q.key} colSpan={2} className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-500 border-b border-l">{q.label}</th>
              ))}
            </tr>
            <tr>
              <th className="sticky top-9 z-10 bg-gray-50 border-b"></th>
              <th className="sticky top-9 z-10 bg-gray-50 border-b"></th>
              <th className="sticky top-9 z-10 bg-gray-50 border-b"></th>
              {QUARTERS.map((q) => (
                <Fragment key={q.key}>
                  <th className="sticky top-9 z-10 bg-gray-50 px-2 py-1.5 text-left text-xs font-medium text-gray-400 border-b border-l">Avg. %</th>
                  <th className="sticky top-9 z-10 bg-gray-50 px-2 py-1.5 text-left text-xs font-medium text-gray-400 border-b">File</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleParticipants.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">No participants match the current filters.</td>
              </tr>
            ) : (
              visibleParticipants.map((p) => {
                const row = rows.find((r) => r.participantId === p.id)!;
                const name = `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;
                const group = getGroupForStatus(p.tskStatus);
                const terms = getTerms(p.id);
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
                    {QUARTERS.map((q) => {
                      const resultField: ResultField = `${q.key}Result`;
                      const fileField: FileField = `${q.key}FileUrl`;
                      const resultValue = terms[resultField];
                      const fileUrl = terms[fileField];
                      const cellId = `${p.id}-${q.key}`;
                      const isUploading = uploading.has(cellId);
                      return (
                        <Fragment key={q.key}>
                          <td className="px-2 py-1 border-l">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={resultValue ?? ""}
                              onChange={(e) => updateTermField(p.id, resultField, e.target.value === "" ? null : Number(e.target.value))}
                              onBlur={() => saveTermField(p.id, resultField)}
                              onKeyDown={onEnterBlur}
                              className={cellInputCls}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {fileUrl && (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                                  View
                                </a>
                              )}
                              <label className="cursor-pointer rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50">
                                {isUploading ? "…" : fileUrl ? "Replace" : "Upload"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFileUpload(p.id, q.key, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleFileRemove(p.id, q.key)}
                                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                  aria-label="Remove"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </Fragment>
                      );
                    })}
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
