"use client";

import { useState } from "react";
import type { TskGroupKey } from "@/lib/tsk-groups";

export default function ShoeRollupExportButtons({ groupFilter }: { groupFilter: "all" | TskGroupKey }) {
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  async function handleExport(format: "csv" | "pdf") {
    setExporting(format);
    const groupParam = groupFilter === "all" ? "" : `&group=${groupFilter}`;
    const res = await fetch(`/api/data-sheets/shoe-rollup/export?format=${format}${groupParam}`);
    if (!res.ok) {
      setExporting(null);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tsk-shoe-size-rollup-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport("csv")}
        disabled={exporting !== null}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {exporting === "csv" ? "Exporting…" : "Export CSV"}
      </button>
      <button
        onClick={() => handleExport("pdf")}
        disabled={exporting !== null}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {exporting === "pdf" ? "Exporting…" : "Export PDF"}
      </button>
    </div>
  );
}
