"use client";

export default function ExportButton({ reportId, month }: { reportId: string; month: string }) {
  async function handleExport() {
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

  return (
    <button onClick={handleExport} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      Export CSV
    </button>
  );
}
