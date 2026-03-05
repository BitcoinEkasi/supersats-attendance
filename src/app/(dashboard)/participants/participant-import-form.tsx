"use client";

import { useState, useRef } from "react";
import { previewParticipantImport, commitParticipantImport } from "@/app/actions/participants";
import { useRouter } from "next/navigation";

type Preview = Awaited<ReturnType<typeof previewParticipantImport>>;

export default function ParticipantImportForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added?: number; error?: string } | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setResult({ error: "Please select a .csv file" });
      return;
    }

    setResult(null);
    setPreview(null);
    setLoading(true);

    try {
      const text = await file.text();
      const p = await previewParticipantImport(text);
      setPreview(p);
    } catch {
      setResult({ error: "Failed to parse CSV" });
    }

    setLoading(false);
  }

  async function handleImport() {
    if (!preview || preview.toImport.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const r = await commitParticipantImport(preview.toImport);
      setResult({ added: r.added });
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setResult({ error: "Import failed" });
    }

    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Import from CSV</h3>
      <p className="mt-1 text-sm text-gray-500">
        Upload the TSK Kids Details CSV to bulk-add participants.
      </p>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-orange-400">
        <span className="text-sm text-gray-600">
          {loading ? "Parsing..." : "Click to select CSV file"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />
      </label>

      {result?.error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {result.error}
        </div>
      )}

      {result?.added !== undefined && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-600">
          Successfully added {result.added} participant{result.added !== 1 ? "s" : ""}.
        </div>
      )}

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
            <p>
              <strong>{preview.toImport.length}</strong> new participant
              {preview.toImport.length !== 1 ? "s" : ""} to import
            </p>
            {preview.duplicates.length > 0 && (
              <p className="text-gray-500">
                <strong>{preview.duplicates.length}</strong> already exist and will be skipped
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

          {preview.toImport.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded border text-sm">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-3 py-1.5">Display Name</th>
                    <th className="px-3 py-1.5">CSV Name</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.toImport.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-medium">{p.displayName}</td>
                      <td className="px-3 py-1.5 text-gray-500">{p.csvName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || preview.toImport.length === 0}
            className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading
              ? "Importing..."
              : `Import ${preview.toImport.length} participant${preview.toImport.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
