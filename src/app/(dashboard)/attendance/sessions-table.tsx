"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteEventButton from "./delete-event-button";
import { TSK_GROUP_LABELS, groupSortIndex } from "@/lib/tsk-groups";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  BEACH_ACTIVITIES: "Beach Activities",
  SIMULATED_HEATS: "Simulated Heats",
  VIDEO_ANALYSIS: "Video Analysis",
  MENTAL_TRAINING: "Mental Training",
  SCORING_REVIEW: "Scoring Review",
  OTHER: "Other",
};

const categoryColors: Record<string, string> = {
  SURFING: "bg-blue-100 text-blue-700",
  FITNESS: "bg-green-100 text-green-700",
  SKATING: "bg-purple-100 text-purple-700",
  BEACH_CLEAN_UP: "bg-yellow-100 text-yellow-700",
  BEACH_ACTIVITIES: "bg-orange-100 text-orange-700",
  SIMULATED_HEATS: "bg-red-100 text-red-700",
  VIDEO_ANALYSIS: "bg-indigo-100 text-indigo-700",
  MENTAL_TRAINING: "bg-pink-100 text-pink-700",
  SCORING_REVIEW: "bg-teal-100 text-teal-700",
  OTHER: "bg-gray-100 text-gray-600",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export type EventRow = {
  id: string;
  date: string;
  dateLabel: string;
  category: string;
  group: string | null;
  note: string | null;
  presentCount: number;
  totalCount: number;
  monthKey: string;    // YYYY-MM
};

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

export default function SessionsTable({
  events,
  approvedMonthGroups,
  isAdmin = false,
}: {
  events: EventRow[];
  approvedMonthGroups: string[];
  isAdmin?: boolean;
}) {
  const approvedSet = new Set(approvedMonthGroups);

  // Build month → day → sessions structure
  const monthKeys: string[] = [];
  const byMonth: Record<string, Record<string, EventRow[]>> = {};

  for (const e of events) {
    if (!byMonth[e.monthKey]) {
      monthKeys.push(e.monthKey);
      byMonth[e.monthKey] = {};
    }
    if (!byMonth[e.monthKey][e.date]) {
      byMonth[e.monthKey][e.date] = [];
    }
    byMonth[e.monthKey][e.date].push(e);
  }

  // Default: most recent month open, its most recent day open
  const defaultMonthOpen = monthKeys.length > 0 ? { [monthKeys[0]]: true } : {};
  const defaultDayOpen: Record<string, boolean> = {};
  if (monthKeys.length > 0) {
    const firstMonth = byMonth[monthKeys[0]];
    const dayKeys = Object.keys(firstMonth);
    if (dayKeys.length > 0) defaultDayOpen[`${monthKeys[0]}:${dayKeys[0]}`] = true;
  }

  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(defaultMonthOpen);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(defaultDayOpen);
  const [notes, setNotes] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(events.map((e) => [e.id, e.note]))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  function toggleMonth(key: string) {
    setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function startEdit(eventId: string) {
    setEditingId(eventId);
    setDraft(notes[eventId] ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  function toggleExpand(id: string) {
    setExpandedNoteId((prev) => (prev === id ? null : id));
  }

  async function saveNote(eventId: string) {
    setSaving(true);
    const trimmed = draft.trim() || null;
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: trimmed }),
    });
    setNotes((prev) => ({ ...prev, [eventId]: trimmed }));
    setEditingId(null);
    setSaving(false);
  }

  function toggleDay(key: string) {
    setOpenDays((prev) => ({ ...prev, [key]: !prev[key] }));
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
          <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Attendees</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
        </tr>
      </thead>
      <tbody>
        {monthKeys.map((monthKey) => {
          const dayMap = byMonth[monthKey];
          const dayKeys = Object.keys(dayMap);
          const allSessions = dayKeys.flatMap((d) => dayMap[d]);
          const totalPresent = allSessions.reduce((s, e) => s + e.presentCount, 0);
          const isMonthOpen = !!openMonths[monthKey];

          return (
            <>
              {/* Month row */}
              <tr
                key={`month-${monthKey}`}
                className="border-b bg-gray-50 cursor-pointer select-none hover:bg-gray-100"
                onClick={() => toggleMonth(monthKey)}
              >
                <td className="px-4 py-2.5" colSpan={5}>
                  <span className="flex items-center gap-2 font-semibold text-gray-700">
                    <ChevronIcon open={isMonthOpen} />
                    {fmtMonth(monthKey)}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {allSessions.length} {allSessions.length === 1 ? "session" : "sessions"} · {totalPresent} total attendees
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5" />
              </tr>

              {isMonthOpen && dayKeys.map((dayKey) => {
                const sessions = dayMap[dayKey];
                const dayTotal = sessions.reduce((s, e) => s + e.presentCount, 0);
                const compoundKey = `${monthKey}:${dayKey}`;
                const isDayOpen = !!openDays[compoundKey];

                return (
                  <>
                    {/* Day row */}
                    <tr
                      key={`day-${compoundKey}`}
                      className="border-b bg-gray-50/60 cursor-pointer select-none hover:bg-gray-100/60"
                      onClick={() => toggleDay(compoundKey)}
                    >
                      <td className="px-4 py-2 pl-10" colSpan={5}>
                        <span className="flex items-center gap-2 text-gray-600 font-medium">
                          <ChevronIcon open={isDayOpen} />
                          {sessions[0].dateLabel}
                          <span className="text-xs font-normal text-gray-400">
                            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} · {dayTotal} attendees
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2" />
                    </tr>

                    {isDayOpen && [...sessions].sort((a, b) => groupSortIndex(a.group) - groupSortIndex(b.group)).map((event) => {
                      const approvedKey = `${event.monthKey}:${event.group ?? "null"}`;
                      const isApproved = approvedSet.has(approvedKey);
                      return (
                        <tr key={event.id} className={`border-b last:border-0${expandedNoteId === event.id ? " [&>td]:align-top" : ""}`}>
                          <td className="px-4 py-3 pl-16 font-medium text-gray-500">{event.dateLabel}</td>
                          <td className="px-4 py-3">
                            {event.group ? (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                                {TSK_GROUP_LABELS[event.group] ?? event.group}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[event.category] || "bg-gray-100 text-gray-600"}`}>
                              {categoryLabels[event.category] || event.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium text-green-700">{event.presentCount}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-gray-600">{event.totalCount}</span>
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin && !isApproved && editingId === event.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveNote(event.id); if (e.key === "Escape") cancelEdit(); }}
                                  className="w-40 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
                                />
                                <button onClick={() => saveNote(event.id)} disabled={saving} className="text-xs text-orange-600 hover:text-orange-800 disabled:opacity-40">Save</button>
                                <button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 w-36">
                                {notes[event.id] ? (
                                  <span
                                    className={`flex-1 min-w-0 text-sm text-gray-500 cursor-pointer select-none ${
                                      expandedNoteId === event.id ? "whitespace-normal break-words" : "truncate"
                                    }`}
                                    onClick={() => toggleExpand(event.id)}
                                  >
                                    {notes[event.id]}
                                  </span>
                                ) : (
                                  <span
                                    className={`flex-1 text-sm italic ${isAdmin && !isApproved ? "cursor-pointer text-gray-300 hover:text-gray-400" : "text-gray-400"}`}
                                    onClick={isAdmin && !isApproved ? () => startEdit(event.id) : undefined}
                                  >
                                    {isAdmin && !isApproved ? "add note" : "—"}
                                  </span>
                                )}
                                {isAdmin && !isApproved && (
                                  <button
                                    onClick={() => startEdit(event.id)}
                                    className="shrink-0 text-gray-300 hover:text-orange-500 transition-colors"
                                    title="Edit note"
                                  >
                                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                      <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Link href={`/attendance/${event.id}`} className="text-orange-600 hover:text-orange-800">
                                View
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
            </>
          );
        })}
      </tbody>
    </table>
  );
}
