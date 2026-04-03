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

function ReportEditor({
  participantId,
  report,
  onSaved,
  onCancel,
}: {
  participantId: string;
  report?: SchoolReport;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [year, setYear] = useState(report?.year?.toString() ?? new Date().getFullYear().toString());
  const [terms, setTerms] = useState<Record<TermKey, TermState>>({
    term1: { result: report?.term1Result?.toString() ?? "", fileUrl: report?.term1FileUrl ?? "", uploading: false },
    term2: { result: report?.term2Result?.toString() ?? "", fileUrl: report?.term2FileUrl ?? "", uploading: false },
    term3: { result: report?.term3Result?.toString() ?? "", fileUrl: report?.term3FileUrl ?? "", uploading: false },
    term4: { result: report?.term4Result?.toString() ?? "", fileUrl: report?.term4FileUrl ?? "", uploading: false },
  });
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
        year: parseInt(year),
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Year</label>
        <input
          type="number"
          value={year}
          onChange={e => setYear(e.target.value)}
          disabled={!!report}
          className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50"
          min={2000}
          max={2100}
        />
      </div>

      <div className="space-y-3">
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
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !year}
          className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SchoolReportsSection({
  participantId,
  reports,
}: {
  participantId: string;
  reports: SchoolReport[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  function handleSaved() {
    setEditing(null);
    router.refresh();
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

  const sorted = [...reports].sort((a, b) => b.year - a.year);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">School Reports</h3>
        {editing !== "new" && (
          <button
            onClick={() => setEditing("new")}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            Add Year
          </button>
        )}
      </div>

      {editing === "new" && (
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <ReportEditor
            participantId={participantId}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {sorted.length === 0 && editing !== "new" && (
        <p className="mt-3 text-sm text-gray-500">No school reports yet.</p>
      )}

      <div className="mt-4 space-y-3">
        {sorted.map(report => (
          <div key={report.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            {editing === report.year ? (
              <ReportEditor
                participantId={participantId}
                report={report}
                onSaved={handleSaved}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">{report.year}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(report.year)}
                      className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(report.year)}
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
