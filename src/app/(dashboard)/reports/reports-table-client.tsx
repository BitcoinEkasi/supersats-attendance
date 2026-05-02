"use client";

import { useState } from "react";
import Link from "next/link";
import { TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import { DeleteReportButton } from "./delete-report-button";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

type ReportEntry = { rewardSats: number; percentage: number };
type ReportRow = { id: string; month: string; group: string | null; status: string; entries: ReportEntry[] };

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
}: {
  monthKeys: string[];
  byMonth: Record<string, ReportRow[]>;
  role: string | undefined | null;
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

        return (
          <>
            <tr
              key={`hdr-${month}`}
              className="cursor-pointer border-b bg-gray-50 hover:bg-gray-100"
              onClick={() => toggle(month)}
            >
              <td className="px-4 py-2" colSpan={7}>
                <div className="flex items-center gap-2">
                  <ChevronIcon open={isOpen} />
                  <span className="font-semibold text-gray-700">{fmtMonth(month)}</span>
                  <span className="text-xs text-gray-400">
                    {monthReports.length} group{monthReports.length !== 1 ? "s" : ""} · {totalParticipants} participants · 🗲 {totalSats.toLocaleString()} sats
                  </span>
                </div>
              </td>
            </tr>

            {isOpen &&
              monthReports.map((report) => {
                const totalSatsRow = report.entries.reduce((s, e) => s + e.rewardSats, 0);
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
                    <td className="px-4 py-3">{report.entries.length}</td>
                    <td className="px-4 py-3 font-medium text-orange-600">🗲 {totalSatsRow.toLocaleString()} sats</td>
                    <td className="px-4 py-3">{avgPct.toFixed(1)}%</td>
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
