"use client";

import { useState } from "react";

type Entry = {
  id: string;
  reportMonth: string;
  attended: number;
  totalEvents: number;
  percentage: number;
  rewardSats: number;
  payoutStatus: string;
  reportStatus: string;
};

type Session = {
  date: string;
  category: string;
  present: boolean;
};

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

export default function MonthlyAttendanceHistory({
  entries,
  sessionsByMonth,
  isJuniorCoach,
}: {
  entries: Entry[];
  sessionsByMonth: Record<string, Session[]>;
  isJuniorCoach: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Monthly Attendance History</h3>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">Month</th>
            <th className="pb-2">Attendance</th>
            <th className="pb-2">Reward</th>
            <th className="pb-2">Payout</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isOpen = expanded === entry.reportMonth;
            const sessions = sessionsByMonth[entry.reportMonth] ?? [];
            return (
              <>
                <tr key={entry.id} className="border-b">
                  <td className="py-2 font-medium">{entry.reportMonth}</td>
                  <td className="py-2">{entry.attended}/{entry.totalEvents} ({entry.percentage.toFixed(1)}%)</td>
                  <td className="py-2">
                    {isJuniorCoach ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Junior Coach</span>
                    ) : entry.rewardSats === 0 ? (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">DNQ</span>
                    ) : (
                      <span className="text-orange-600 font-medium">⚡ {entry.rewardSats.toLocaleString()} sats</span>
                    )}
                  </td>
                  <td className="py-2">
                    {entry.rewardSats > 0 && !isJuniorCoach && (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entry.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {entry.payoutStatus === "paid" ? "Paid" : "Pending"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => setExpanded(isOpen ? null : entry.reportMonth)}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      {isOpen ? "Hide Sessions ▲" : "View Sessions ▼"}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${entry.id}-detail`}>
                    <td colSpan={5} className="pb-3 pt-1">
                      {sessions.length === 0 ? (
                        <p className="px-2 text-xs text-gray-400">No sessions recorded for this month.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="pb-1 pl-2 font-medium">Date</th>
                              <th className="pb-1 font-medium">Category</th>
                              <th className="pb-1 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((s, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="py-1 pl-2 text-gray-600">{s.date}</td>
                                <td className="py-1 text-gray-600">{categoryLabels[s.category] || s.category}</td>
                                <td className="py-1">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${s.present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {s.present ? "Present" : "Absent"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
