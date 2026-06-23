"use client";

import { useState } from "react";

export default function ExportButton({ reportId, month }: { reportId: string; month: string }) {
  const [csvLoading, setCsvLoading] = useState(false);

  async function handleCsv() {
    setCsvLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/export`);
      if (!res.ok) return;
      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tsk-report-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleCsv} disabled={csvLoading} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {csvLoading ? "Exporting…" : "Export CSV"}
      </button>
      <button onClick={() => window.print()} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Save as PDF
      </button>
    </div>
  );
}
