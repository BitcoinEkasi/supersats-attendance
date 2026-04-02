"use client";

import { useRef, useState } from "react";

export default function BackupRestore() {
  const [restoreState, setRestoreState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setRestoreState("loading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/restore", { method: "POST", body: form });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRestoreState("error");
      setErrorMsg(data.error ?? "Restore failed");
      return;
    }

    setRestoreState("done");
  }

  return (
    <div className="space-y-6">
      {/* Backup */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Download Backup</h3>
        <p className="mt-1 text-sm text-gray-500">
          Downloads a zip containing the database and all uploaded files.
        </p>
        <a
          href="/api/backup"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Backup
        </a>
      </div>

      {/* Restore */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Restore from Backup</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload a previously downloaded backup zip. The server will restart automatically after restore.
        </p>
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Warning:</strong> This will overwrite all current data and uploaded files.
        </div>

        {restoreState === "done" ? (
          <p className="mt-4 text-sm font-medium text-green-700">
            Restore complete. The server is restarting — please wait a few seconds then refresh.
          </p>
        ) : (
          <form onSubmit={handleRestore} className="mt-4 flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              required
              className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
            />
            <button
              type="submit"
              disabled={restoreState === "loading"}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {restoreState === "loading" ? "Restoring…" : "Restore"}
            </button>
          </form>
        )}

        {restoreState === "error" && (
          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
