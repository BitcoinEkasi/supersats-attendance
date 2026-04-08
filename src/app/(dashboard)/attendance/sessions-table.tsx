"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteEventButton from "./delete-event-button";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

const categoryColors: Record<string, string> = {
  SURFING: "bg-blue-100 text-blue-700",
  FITNESS: "bg-green-100 text-green-700",
  SKATING: "bg-purple-100 text-purple-700",
  BEACH_CLEAN_UP: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-600",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export type EventRow = {
  id: string;
  date: string;        // UTC ISO string (stored at noon UTC)
  dateLabel: string;   // pre-formatted display string
  category: string;
  note: string | null;
  presentCount: number;
  monthKey: string;    // YYYY-MM
};

export default function SessionsTable({
  events,
  approvedMonths,
}: {
  events: EventRow[];
  approvedMonths: string[];
}) {
  const approvedSet = new Set(approvedMonths);

  // Group by month, preserving desc order
  const monthKeys: string[] = [];
  const byMonth: Record<string, EventRow[]> = {};
  for (const e of events) {
    if (!byMonth[e.monthKey]) {
      monthKeys.push(e.monthKey);
      byMonth[e.monthKey] = [];
    }
    byMonth[e.monthKey].push(e);
  }

  // Most recent month open by default
  const [open, setOpen] = useState<Record<string, boolean>>(
    monthKeys.length > 0 ? { [monthKeys[0]]: true } : {}
  );

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (events.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-gray-500">
        No sessions yet. Create one to start capturing attendance.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Attendees</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
        </tr>
      </thead>
      <tbody>
        {monthKeys.map((key) => {
          const sessions = byMonth[key];
          const isOpen = !!open[key];
          const totalPresent = sessions.reduce((s, e) => s + e.presentCount, 0);

          return (
            <>
              {/* Month header row */}
              <tr
                key={`month-${key}`}
                className="border-b bg-gray-50 cursor-pointer select-none hover:bg-gray-100"
                onClick={() => toggle(key)}
              >
                <td className="px-4 py-2.5" colSpan={4}>
                  <span className="flex items-center gap-2 font-semibold text-gray-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {fmtMonth(key)}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {sessions.length} {sessions.length === 1 ? "session" : "sessions"} · {totalPresent} total attendees
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5" />
              </tr>

              {/* Session rows */}
              {isOpen && sessions.map((event) => {
                const isApproved = approvedSet.has(event.monthKey);
                return (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="px-4 py-3 pl-10 font-medium">{event.dateLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[event.category] || "bg-gray-100 text-gray-600"}`}>
                        {categoryLabels[event.category] || event.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800 font-medium">
                        {event.presentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{event.note || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/attendance/${event.id}`} className="text-orange-600 hover:text-orange-800">
                          Open
                        </Link>
                        {!isApproved && (
                          <DeleteEventButton eventId={event.id} eventDate={event.dateLabel} />
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
    </table>
  );
}
