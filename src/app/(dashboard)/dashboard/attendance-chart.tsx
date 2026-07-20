"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import { getSASTNow } from "@/lib/sast";
import type { DayEntry, StatsData } from "@/lib/types/attendance-stats";
import ExcuseSessionModal from "./excuse-session-modal";

function DayAxisTick(props: { x?: string | number; y?: string | number; payload?: { value: string }; days: DayEntry[] }) {
  const { x = 0, y = 0, payload, days } = props;
  const day = days.find((d) => d.label === payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={11} textAnchor="middle" fontSize={11} fill="#374151">{payload?.value}</text>
      <text x={0} y={0} dy={22} textAnchor="middle" fontSize={9} fill="#9ca3af">{day?.weekday ?? ""}</text>
      <text x={0} y={0} dy={33} textAnchor="middle" fontSize={8} fill="#9ca3af">{day?.activity ?? ""}</text>
    </g>
  );
}

function cellFill(entry: DayEntry, isParticipantView: boolean): string {
  switch (entry.dayType) {
    case "off":
      return "#e5e7eb"; // gray-200, muted — not a signal
    case "excused":
      return "#e5e7eb"; // same as "off" — the flag icon, not bar color, communicates "deliberate decision"
    case "gap":
      return "#ef4444"; // red-500 — sessions missed
    case "future":
      return "#e5e7eb"; // gray-200, same as off/excused — hasn't happened yet
    case "session":
      return isParticipantView
        ? entry.presentCount > 0 ? "#22c55e" : "#ef4444"
        : "#14b8a6"; // teal-500 — sessions held
  }
}

function BarLabel(props: {
  x?: string | number; y?: string | number; width?: string | number; value?: React.ReactNode; index?: number;
  days: DayEntry[]; groupSelected: boolean; onFlagClick: (day: DayEntry) => void;
}) {
  const { value, index = 0, days, groupSelected, onFlagClick } = props;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const day = days[index];
  const isFlaggable = groupSelected && (day?.dayType === "gap" || day?.dayType === "excused");

  if (isFlaggable) {
    const cx = x + width / 2;
    const cy = y - 8; // just above the (minPointSize-pinned) bar top
    const isExcused = day.dayType === "excused";
    const isFlaggedGap = day.dayType === "gap" && !!day.excuseReason; // has a reason but still counts as a gap — controllable failure
    const flagColor = isExcused ? "#000000" : isFlaggedGap ? "#ef4444" : "none";
    const strokeColor = isExcused ? "#000000" : isFlaggedGap ? "#ef4444" : "#9ca3af";
    return (
      <g
        transform={`translate(${cx},${cy})`}
        onClick={(e) => { e.stopPropagation(); onFlagClick(day); }}
        style={{ cursor: "pointer" }}
      >
        <rect x={-10} y={-12} width={20} height={20} fill="transparent" />
        <path
          d="M-3 -8 v14 M-3 -8 h9 l-2 3 2 3 h-9"
          fill={flagColor}
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (day?.dayType === "session") {
    return (
      <text x={x + width / 2} y={y} dy={14} textAnchor="middle" fontSize={11} fill="#000000">
        {value}
      </text>
    );
  }
  return null; // off days, and gap/excused days with no group selected — nothing to show
}

type SlimParticipant = {
  id: string;
  tskId: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
};

function getLast12Months(): { value: string; label: string }[] {
  const { year, month } = getSASTNow();
  const result = [];
  for (let i = 0; i < 12; i++) {
    let m = month - i;
    let y = year;
    while (m <= 0) { m += 12; y -= 1; }
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(`${value}-15T12:00:00Z`).toLocaleString("en-ZA", { month: "long", year: "numeric" });
    result.push({ value, label });
  }
  return result;
}

const MONTHS = getLast12Months();

export default function AttendanceChart() {
  const [month, setMonth] = useState(MONTHS[0].value);
  const [group, setGroup] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [participants, setParticipants] = useState<SlimParticipant[]>([]);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalDay, setModalDay] = useState<DayEntry | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!group) {
      setParticipants([]);
      setParticipantId("");
      return;
    }
    fetch(`/api/participants?group=${group}&status=ACTIVE&slim=true`)
      .then((r) => r.json())
      .then((p: SlimParticipant[]) => setParticipants(p))
      .catch(() => setParticipants([]));
    setParticipantId("");
  }, [group]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (group) params.set("group", group);
    if (participantId) params.set("participantId", participantId);
    fetch(`/api/attendance/stats?${params}`)
      .then((r) => r.json())
      .then((d: StatsData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [month, group, participantId, refreshTick]);

  const selectedParticipant = participants.find((p) => p.id === participantId);

  function handleFlagClick(day: DayEntry) {
    if (!group) return;
    setModalDay(day);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Groups</option>
          {TSK_GROUPS.map((g) => (
            <option key={g} value={g}>{TSK_GROUP_LABELS[g]}</option>
          ))}
        </select>

        {group && (
          <select
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Participants</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.knownAs ?? p.fullNames} {p.surname} ({p.tskId})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary */}
      {data && !loading && (
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          <span>
            <span className="font-medium text-gray-900">
              {data.days.filter((d) => d.dayType !== "off" && d.dayType !== "excused" && d.dayType !== "future").length}
            </span> potential sessions
          </span>
          <span>
            <span className="font-medium text-green-600">
              {data.days.filter((d) => d.dayType === "session").length}
            </span> held
          </span>
          {data.days.filter((d) => d.dayType === "gap").length > 0 && (
            <span>
              <span className="font-medium" style={{ color: "#ef4444" }}>
                {data.days.filter((d) => d.dayType === "gap").length}
              </span> gaps
            </span>
          )}
          {data.days.filter((d) => d.dayType === "excused").length > 0 && (
            <span>
              <span className="font-medium text-gray-700">
                {data.days.filter((d) => d.dayType === "excused").length}
              </span> excused
            </span>
          )}
          <span>
            <span className="font-medium text-gray-900">{data.average}</span> avg{" "}
            {data.isParticipantView ? "attendance (0/1)" : "attendees"}
          </span>
          <span>
            <span className="font-medium text-blue-600">{data.totalParticipants}</span>{" "}
            {data.isParticipantView ? "participant" : "registered"}
          </span>
          {selectedParticipant && (
            <span className="font-medium text-orange-600">
              {selectedParticipant.knownAs ?? selectedParticipant.fullNames} {selectedParticipant.surname}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      {loading && (
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      )}

      {!loading && data && data.days.every((d) => d.dayType !== "session") && (
        <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          No sessions recorded for this period
        </div>
      )}

      {!loading && data && data.days.some((d) => d.dayType === "session") && (
        <div style={{ paddingLeft: "7.5%", paddingRight: "7.5%" }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.days} margin={{ top: 8, right: 24, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={(props) => <DayAxisTick {...props} days={data.days} />} interval={0} height={44} />
              <YAxis hide domain={[0, Math.max(data.totalParticipants, ...(data.days.map(d => d.presentCount))) + 2]} />
              <Tooltip
                formatter={(value, name) => {
                  const v = typeof value === "number" ? value : Number(value);
                  if (name === "presentCount") return [v, data.isParticipantView ? "Present" : "Attended"];
                  return [v, String(name)];
                }}
                labelFormatter={(label) => {
                  const day = data.days.find((d) => d.label === label);
                  if (!day) return label;
                  const dateStr = new Date(day.date + "T12:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
                  if (day.dayType === "future") {
                    return `${dateStr} — Upcoming`;
                  }
                  if (day.dayType === "excused") {
                    const reasonText = day.excuseReason === "Other" ? day.excuseReasonOther : day.excuseReason;
                    return `${dateStr} — Excused (${reasonText})`;
                  }
                  if (day.dayType === "gap") {
                    if (day.excuseReason) {
                      const reasonText = day.excuseReason === "Other" ? day.excuseReasonOther : day.excuseReason;
                      return `${dateStr} — Gap: ${reasonText}`;
                    }
                    return `${dateStr} — Gap (no session held)`;
                  }
                  return dateStr;
                }}
              />

              <Bar
                dataKey="presentCount"
                name="presentCount"
                radius={[3, 3, 0, 0]}
                minPointSize={4}
                label={(props) => (
                  <BarLabel {...props} days={data.days} groupSelected={!!group} onFlagClick={handleFlagClick} />
                )}
              >
                {data.days.map((entry, index) => (
                  <Cell key={index} fill={cellFill(entry, data.isParticipantView)} />
                ))}
              </Bar>

              <ReferenceLine
                y={data.totalParticipants}
                stroke="#3b82f6"
                strokeWidth={1.5}
                label={{ value: `${data.totalParticipants}`, position: "left", fontSize: 12, fontWeight: 600, fill: "#3b82f6" }}
              />

              <ReferenceLine
                y={Math.round(data.totalParticipants * 0.7)}
                stroke="#16a34a"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{ value: `${Math.round(data.totalParticipants * 0.7)} (70%)`, position: "left", fontSize: 12, fontWeight: 600, fill: "#16a34a" }}
              />

              {data.days.some((d) => d.trend !== null) && (
                <Line dataKey="trend" name="trend" stroke="#9ca3af" strokeWidth={1.5} dot={false} connectNulls />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {modalDay && group && (
        <ExcuseSessionModal
          day={modalDay}
          group={group as TskGroupKey}
          groupLabel={TSK_GROUP_LABELS[group]}
          onClose={() => setModalDay(null)}
          onSaved={() => setRefreshTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
