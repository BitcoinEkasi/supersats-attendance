"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface CsvParticipantRow {
  surname: string;
  fullNames: string;
  knownAs: string | null;
  idNumber: string;
  boltCardUrl: string | null;
  cardNumber: string | null;
  registrationDate: string | null;
  profilePicture: string | null;
  ethnicity: string | null;
  language: string | null;
  school: string | null;
  grade: string | null;
  guardian: string | null;
  guardianId: string | null;
  guardianRelationship: string | null;
  address: string | null;
  contact1: string | null;
  contact2: string | null;
  housingType: string | null;
  rowIndex: number;
  parseError?: string;
}

interface CsvImportPreview {
  toImport: CsvParticipantRow[];
  duplicates: CsvParticipantRow[];
  invalid: CsvParticipantRow[];
  warnings: string[];
}

export default function ParticipantImportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ added?: number; updated?: number } | null>(null);
  const [updatingDates, setUpdatingDates] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);
    try {
      const csvText = await file.text();
      const res = await fetch("/api/participants/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setPreview(data);
    } catch {
      setError("Failed to parse file. Please check the format.");
    }
    setLoading(false);
  }

  async function handleImport() {
    if (!preview || preview.toImport.length === 0) return;
    setCommitting(true);
    setError("");
    try {
      const res = await fetch("/api/participants/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.toImport, mode: "import" }),
      });
      const data = await res.json();
      setResult({ added: data.added });
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Import failed. Please try again.");
    }
    setCommitting(false);
  }

  async function handleUpdateDates() {
    if (!preview || preview.duplicates.length === 0) return;
    setUpdatingDates(true);
    setError("");
    try {
      const res = await fetch("/api/participants/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.duplicates, mode: "update" }),
      });
      const data = await res.json();
      setResult({ updated: data.updated });
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Date update failed. Please try again.");
    }
    setUpdatingDates(false);
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Import from CSV</h3>
      <p className="mt-1 text-xs text-gray-500">Accepts comma- or tab-delimited files. Expected column headers:</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {[
          "Card number", "Full Names", "Surname", "Known as", "SA ID Number",
          "Gender", "Ethnicity", "Language", "Date from", "School", "Grade",
          "Guardian", "Guardian ID", "Relationship", "Address",
          "1st Contact", "2nd Contact", "Housing Type", "Profile Link",
        ].map((col) => (
          <span key={col} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">{col}</span>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Select file</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFile}
          disabled={loading || committing}
          className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-gray-700 hover:file:bg-gray-50"
        />
      </div>

      {loading && <p className="mt-3 text-sm text-gray-500">Parsing file...</p>}

      {error && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      {result && (
        <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {result.added != null && <>Successfully imported <strong>{result.added}</strong> participant{result.added !== 1 ? "s" : ""}.</>}
          {result.updated != null && <>Updated <strong>{result.updated}</strong> participant{result.updated !== 1 ? "s" : ""}.</>}
        </div>
      )}

      {preview && (
        <div className="mt-4 space-y-3">
          {preview.warnings.map((w, i) => (
            <div key={i} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">⚠ {w}</div>
          ))}

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md bg-green-50 p-2">
              <div className="text-lg font-bold text-green-700">{preview.toImport.length}</div>
              <div className="text-xs text-green-600">New</div>
            </div>
            <div className="rounded-md bg-yellow-50 p-2">
              <div className="text-lg font-bold text-yellow-700">{preview.duplicates.length}</div>
              <div className="text-xs text-yellow-600">Already exist</div>
            </div>
            <div className="rounded-md bg-red-50 p-2">
              <div className="text-lg font-bold text-red-700">{preview.invalid.length}</div>
              <div className="text-xs text-red-600">Invalid</div>
            </div>
          </div>

          {preview.toImport.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Will be imported:</p>
              <div className="max-h-40 overflow-y-auto rounded border border-gray-200 text-xs">
                {preview.toImport.map((row) => (
                  <div key={row.rowIndex} className="flex items-center justify-between border-b px-3 py-1.5 last:border-0">
                    <span className="font-medium">{row.surname}, {row.fullNames}</span>
                    <span className="font-mono text-gray-400">{row.idNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.duplicates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-yellow-700 mb-1">Already exist (will update all fields):</p>
              <div className="max-h-28 overflow-y-auto rounded border border-yellow-100 text-xs mb-2">
                {preview.duplicates.map((row) => (
                  <div key={row.rowIndex} className="flex items-center justify-between border-b px-3 py-1.5 last:border-0">
                    <span className="font-medium">{row.surname}, {row.fullNames}</span>
                    <span className="font-mono text-gray-400">{row.registrationDate || "no date"}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleUpdateDates} disabled={updatingDates} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {updatingDates ? "Updating..." : `Update ${preview.duplicates.length} existing participant${preview.duplicates.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          {preview.invalid.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1">Rows with errors (will be skipped):</p>
              <div className="max-h-28 overflow-y-auto rounded border border-red-100 text-xs">
                {preview.invalid.map((row) => (
                  <div key={row.rowIndex} className="border-b px-3 py-1.5 last:border-0">
                    <span className="font-medium">Row {row.rowIndex}: </span>
                    <span className="text-gray-600">{row.surname || row.fullNames || "(blank)"}</span>
                    <span className="ml-2 text-red-500">— {row.parseError}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {preview.toImport.length > 0 && (
              <button onClick={handleImport} disabled={committing} className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                {committing ? "Importing..." : `Import ${preview.toImport.length} new participant${preview.toImport.length !== 1 ? "s" : ""}`}
              </button>
            )}
            <button onClick={reset} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
