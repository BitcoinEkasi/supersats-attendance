"use client";

import { exportReportCSV } from "@/app/actions/reports";

export default function ExportButton({
  reportId,
  month,
}: {
  reportId: string;
  month: string;
}) {
  async function handleExport() {
    const csv = await exportReportCSV(reportId);
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tsk-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Export CSV
    </button>
  );
}
