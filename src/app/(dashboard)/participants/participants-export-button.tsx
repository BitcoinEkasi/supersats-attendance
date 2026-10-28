"use client";

export default function ParticipantsExportButton() {
  async function download(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) return;
    const csv = await res.text();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  }

  const btnCls = "rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => download("/api/participants/export/google-contacts", "tsk-google-contacts")} className={btnCls}>
        Export Google Contacts
      </button>
      <button onClick={() => download("/api/participants/export", "tsk-participants")} className={btnCls}>
        Export CSV
      </button>
    </div>
  );
}
