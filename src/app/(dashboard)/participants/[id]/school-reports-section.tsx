"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SchoolReport } from "@prisma/client";

const TERMS = [
  { key: "term1", label: "1st Term" },
  { key: "term2", label: "2nd Term" },
  { key: "term3", label: "3rd Term" },
  { key: "term4", label: "Final Term" },
] as const;

type TermKey = "term1" | "term2" | "term3" | "term4";

interface TermState {
  result: string;
  fileUrl: string;
  uploading: boolean;
}

function initTerms(report?: SchoolReport): Record<TermKey, TermState> {
  return {
    term1: { result: report?.term1Result?.toString() ?? "", fileUrl: report?.term1FileUrl ?? "", uploading: false },
    term2: { result: report?.term2Result?.toString() ?? "", fileUrl: report?.term2FileUrl ?? "", uploading: false },
    term3: { result: report?.term3Result?.toString() ?? "", fileUrl: report?.term3FileUrl ?? "", uploading: false },
    term4: { result: report?.term4Result?.toString() ?? "", fileUrl: report?.term4FileUrl ?? "", uploading: false },
  };
}

function CurrentYearEditor({
  participantId,
  year,
  report,
  onSaved,
}: {
  participantId: string;
  year: number;
  report?: SchoolReport;
  onSaved: () => void;
}) {
  const [terms, setTerms] = useState<Record<TermKey, TermState>>(() => initTerms(report));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<Record<TermKey, HTMLInputElement | null>>({ term1: null, term2: null, term3: null, term4: null });

  async function handleUpload(term: TermKey, file: File) {
    setTerms(t => ({ ...t, [term]: { ...t[term], uploading: true } }));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setTerms(t => ({ ...t, [term]: { ...t[term], uploading: false, fileUrl: data.path ?? t[term].fileUrl } }));
    if (data.error) setError(data.error);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/participants/${participantId}/school-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        term1Result: terms.term1.result ? parseFloat(terms.term1.result) : null,
        term1FileUrl: terms.term1.fileUrl || null,
        term2Result: terms.term2.result ? parseFloat(terms.term2.result) : null,
        term2FileUrl: terms.term2.fileUrl || null,
        term3Result: terms.term3.result ? parseFloat(terms.term3.result) : null,
        term3FileUrl: terms.term3.fileUrl || null,
        term4Result: terms.term4.result ? parseFloat(terms.term4.result) : null,
        term4FileUrl: terms.term4.fileUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save");
      return;
    }
    onSaved();
  }

  const inputCls = "block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  return (
    <div className="space-y-3 pt-3">
      {TERMS.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-3 items-center gap-3">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <input
            type="number"
            placeholder="Result %"
            value={terms[key].result}
            onChange={e => setTerms(t => ({ ...t, [key]: { ...t[key], result: e.target.value } }))}
            className={inputCls}
            min={0}
            max={100}
            step={0.1}
          />
          <div className="flex items-center gap-2">
            {terms[key].fileUrl && (
              <a href={terms[key].fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline truncate max-w-[80px]">
                View
              </a>
            )}
            <button
              type="button"
              disabled={terms[key].uploading}
              onClick={() => fileRefs.current[key]?.click()}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            >
              {terms[key].uploading ? "Uploading…" : terms[key].fileUrl ? "Replace" : "Upload"}
            </button>
            {terms[key].fileUrl && (
              <button
                type="button"
                onClick={() => setTerms(t => ({ ...t, [key]: { ...t[key], fileUrl: "" } }))}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                aria-label="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <input
              ref={el => { fileRefs.current[key] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); }}
            />
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function LockedYearBody({ report }: { report: SchoolReport }) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
      {TERMS.map(({ key, label }) => {
        const result = report[`${key}Result` as keyof SchoolReport] as number | null;
        const fileUrl = report[`${key}FileUrl` as keyof SchoolReport] as string | null;
        return (
          <div key={key} className="rounded bg-white p-2 border border-gray-100">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {result != null ? `${result}%` : <span className="text-gray-400">—</span>}
            </p>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                View report
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SchoolReportsSection({
  participantId,
  reports,
  tskStatus,
}: {
  participantId: string;
  reports: SchoolReport[];
  tskStatus: string | null;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const years = [...new Set([currentYear, ...reports.map(r => r.year)])].sort((a, b) => b - a);
  const reportByYear = Object.fromEntries(reports.map(r => [r.year, r]));

  const [openYears, setOpenYears] = useState<Set<number>>(() => new Set([currentYear]));

  function toggleYear(year: number) {
    setOpenYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  async function handleDelete(year: number) {
    if (!confirm(`Delete school report for ${year}?`)) return;
    await fetch(`/api/participants/${participantId}/school-reports`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    router.refresh();
  }

  function handleSaved() {
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">School Reports</h3>

      <div className="mt-4 space-y-2">
        {years.map(year => {
          const isLocked = year < currentYear;
          const isOpen = openYears.has(year);
          const report = reportByYear[year];
          const heading = tskStatus ? `${year} — ${tskStatus}` : `${year}`;

          return (
            <div
              key={year}
              className={`rounded-lg border ${isLocked ? "border-gray-200" : "border-orange-200"}`}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg ${
                  isLocked ? "bg-gray-50 hover:bg-gray-100" : "bg-orange-50 hover:bg-orange-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{heading}</span>
                  {isLocked && (
                    <span className="text-xs text-gray-400">🔒 Locked</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isLocked && report && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(year); }}
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {/* Body */}
              {isOpen && (
                <div className="px-4 pb-4">
                  {isLocked ? (
                    report
                      ? <LockedYearBody report={report} />
                      : <p className="pt-3 text-sm text-gray-400">No data recorded for this year.</p>
                  ) : (
                    <CurrentYearEditor
                      participantId={participantId}
                      year={year}
                      report={report}
                      onSaved={handleSaved}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
