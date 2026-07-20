"use client";

import { useState } from "react";
import Link from "next/link";
import { TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import { fmtPct } from "@/lib/rewards";
import { DeleteReportButton } from "./delete-report-button";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

type ReportEntry = { rewardSats: number; percentage: number; totalEvents: number };
type ReportRow = { id: string; month: string; group: string | null; status: string; zarPerSat: number | null; recruited: number; retired: number; entries: ReportEntry[] };

function fmtZar(sats: number, zarPerSat: number | null): string | null {
  if (!zarPerSat) return null;
  const zar = sats * zarPerSat;
  return `R ${zar.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
  return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
}

export function ReportsTableClient({
  monthKeys,
  byMonth,
  role,
  zarPerSat,
}: {
  monthKeys: string[];
  byMonth: Record<string, ReportRow[]>;
  role: string | undefined | null;
  zarPerSat: number | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (month: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });

  return (
    <tbody>
      {monthKeys.map((month) => {
        const monthReports = byMonth[month];
        const isOpen = !collapsed.has(month);
        const totalSats = monthReports.reduce((s, r) => s + r.entries.reduce((a, e) => a + e.rewardSats, 0), 0);
        const totalParticipants = monthReports.reduce((s, r) => s + r.entries.length, 0);
        const totalRecruited = monthReports.reduce((s, r) => s + r.recruited, 0);
        const totalRetired = monthReports.reduce((s, r) => s + r.retired, 0);

        // Use each report's locked rate if approved, else fall back to live rate
        const allLocked = monthReports.every((r) => r.status === "APPROVED" && r.zarPerSat != null);
        const monthZarParts = monthReports.map((r) => {
          const rate = r.status === "APPROVED" && r.zarPerSat != null ? r.zarPerSat : zarPerSat;
          if (rate == null) return null;
          return r.entries.reduce((a, e) => a + e.rewardSats, 0) * rate;
        });
        const monthZar =
          monthZarParts.every((p) => p != null)
            ? (monthZarParts as number[]).reduce((s, p) => s + p, 0)
            : null;
        const fmtMonthZar = monthZar != null
          ? `R ${monthZar.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null;

        return (
          <>
            <tr
              key={`hdr-${month}`}
              className="cursor-pointer border-b bg-gray-50 hover:bg-gray-100"
              onClick={() => toggle(month)}
            >
              <td className="px-4 py-2" colSpan={8}>
                <div className="flex items-center gap-2">
                  <ChevronIcon open={isOpen} />
                  <span className="font-semibold text-gray-700">{fmtMonth(month)}</span>
                  <span className="text-xs text-gray-400">
                    {monthReports.length} group{monthReports.length !== 1 ? "s" : ""} · {totalParticipants}
                    {(totalRecruited > 0 || totalRetired > 0) && (
                      <>
                        {" "}({totalRecruited > 0 && <span className="text-green-600">+{totalRecruited}</span>}
                        {totalRecruited > 0 && totalRetired > 0 && " "}
                        {totalRetired > 0 && <span className="text-red-500">−{totalRetired}</span>})
                      </>
                    )} participants · 🗲 {totalSats.toLocaleString()} sats
                    {fmtMonthZar && (
                      <span className={allLocked ? "text-green-600" : ""}> ({fmtMonthZar})</span>
                    )}
                  </span>
                </div>
              </td>
            </tr>

            {isOpen &&
              monthReports.map((report) => {
                const totalSatsRow = report.entries.reduce((s, e) => s + e.rewardSats, 0);
                const totalSessions = report.entries.length > 0 ? Math.max(...report.entries.map((e) => e.totalEvents)) : 0;
                const avgPct =
                  report.entries.length > 0
                    ? report.entries.reduce((s, e) => s + e.percentage, 0) / report.entries.length
                    : 0;
                const groupLabel = report.group ? (TSK_GROUP_LABELS[report.group] ?? report.group) : "All";

                return (
                  <tr key={report.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtMonth(month)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${report.group ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                        {groupLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                    <td className="px-4 py-3">
                      {report.entries.length}
                      {(report.recruited > 0 || report.retired > 0) && (
                        <span className="ml-1 text-xs font-medium">
                          ({report.recruited > 0 && <span className="text-green-600">+{report.recruited}</span>}
                          {report.recruited > 0 && report.retired > 0 && " "}
                          {report.retired > 0 && <span className="text-red-500">−{report.retired}</span>})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{totalSessions}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">
                      🗲 {totalSatsRow.toLocaleString()} sats
                      {fmtZar(totalSatsRow, report.status === "APPROVED" ? (report.zarPerSat ?? zarPerSat) : zarPerSat) && (
                        <span className={`ml-1 text-xs font-normal ${report.status === "APPROVED" && report.zarPerSat ? "text-green-600" : "text-gray-400"}`}>
                          ({fmtZar(totalSatsRow, report.status === "APPROVED" ? (report.zarPerSat ?? zarPerSat) : zarPerSat)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{fmtPct(avgPct)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/reports/${report.id}`} className="text-orange-600 hover:text-orange-800">View</Link>
                        {role === "ADMINISTRATOR" && report.status === "PENDING" && (
                          <DeleteReportButton reportId={report.id} month={report.month} group={groupLabel} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </>
        );
      })}
    </tbody>
  );
}
