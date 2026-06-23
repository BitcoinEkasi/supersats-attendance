"use client";

import { useState } from "react";

export default function ExportButton({ reportId, month }: { reportId: string; month: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleCsv() {
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
  }

  async function handlePdf() {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/export/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `tsk-report-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleCsv} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Export CSV
      </button>
      <button onClick={handlePdf} disabled={pdfLoading} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {pdfLoading ? "Generating…" : "Export PDF"}
      </button>
    </div>
  );
}
