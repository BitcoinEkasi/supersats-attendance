"use client";

import { useState, useRef } from "react";
import { previewCSVImport, commitCSVImport } from "@/app/actions/attendance";
import type { ImportPreview } from "@/app/actions/attendance";
import { useRouter } from "next/navigation";

export default function CSVUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    recordCount?: number;
    matchedCount?: number;
    unmatchedCount?: number;
    error?: string;
  } | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setResult({ error: "Please select a .csv file" });
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setFilename(file.name);
    setResult(null);
    setPreview(null);

    // Auto-preview
    setLoading(true);
    try {
      const p = await previewCSVImport(text, file.name);
      setPreview(p);
    } catch {
      setResult({ error: "Failed to parse CSV" });
    }
    setLoading(false);
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);
    try {
      const r = await commitCSVImport(csvText, filename);
      if (r.error) {
        setResult({ error: r.error });
      } else {
        setResult({
          success: true,
          recordCount: r.recordCount,
          matchedCount: r.matchedCount,
          unmatchedCount: r.unmatchedCount,
        });
        setPreview(null);
        setCsvText("");
        setFilename("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      }
    } catch {
      setResult({ error: "Import failed" });
    }
    setLoading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Import CSV</h3>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-orange-400"
      >
        <svg
          className="h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          Drag & drop your presli.io CSV here, or
        </p>
        <label className="mt-2 cursor-pointer rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
          Browse files
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {filename && (
        <p className="mt-2 text-sm text-gray-600">
          Selected: <span className="font-medium">{filename}</span>
        </p>
      )}

      {loading && (
        <p className="mt-4 text-sm text-gray-500">Processing...</p>
      )}

      {result?.error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {result.error}
        </div>
      )}

      {result?.success && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-600">
          Import successful: {result.recordCount} records from{" "}
          {result.matchedCount} participants.
          {result.unmatchedCount! > 0 && (
            <span className="text-orange-600">
              {" "}
              {result.unmatchedCount} names were not matched.
            </span>
          )}
        </div>
      )}

      {preview && (
        <div className="mt-4 space-y-4">
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
            <p>
              <strong>Month:</strong> {preview.month}
            </p>
            <p>
              <strong>Dates:</strong> {preview.dates.length} session days
            </p>
            <p>
              <strong>Matched:</strong> {preview.matched.length} participants
            </p>
            {preview.unmatched.length > 0 && (
              <p className="text-orange-600">
                <strong>Unmatched:</strong> {preview.unmatched.length} names
              </p>
            )}
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              <p className="font-medium">Warnings:</p>
              <ul className="mt-1 list-disc pl-4">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.unmatched.length > 0 && (
            <div className="rounded border border-orange-200 bg-orange-50 p-3 text-sm">
              <p className="font-medium text-orange-700">
                Unmatched names (will be skipped):
              </p>
              <ul className="mt-1 list-disc pl-4 text-orange-600">
                {preview.unmatched.map((u, i) => (
                  <li key={i}>{u.csvName}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-orange-500">
                Add these as participants first, then re-import.
              </p>
            </div>
          )}

          {preview.matched.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                Matched participants:
              </p>
              <div className="mt-2 max-h-48 overflow-y-auto rounded border text-sm">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b text-left text-gray-500">
                      <th className="px-3 py-1.5">Name</th>
                      <th className="px-3 py-1.5">Present</th>
                      <th className="px-3 py-1.5">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.matched.map((m) => {
                      const present = Object.values(m.attendance).filter(
                        (v) => v === 1,
                      ).length;
                      const absent = Object.values(m.attendance).filter(
                        (v) => v === -1,
                      ).length;
                      return (
                        <tr key={m.participantId} className="border-b last:border-0">
                          <td className="px-3 py-1.5">{m.displayName}</td>
                          <td className="px-3 py-1.5 text-green-600">
                            {present}
                          </td>
                          <td className="px-3 py-1.5 text-red-600">{absent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || preview.matched.length === 0}
            className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Importing..." : `Import ${preview.matched.length} participants`}
          </button>
        </div>
      )}
    </div>
  );
}
