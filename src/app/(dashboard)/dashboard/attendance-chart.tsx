"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import { getSASTNow } from "@/lib/sast";
import type { DayEntry, StatsData } from "@/lib/types/attendance-stats";

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
    case "gap":
      return "#7c3aed"; // violet-600 — deliberately not red, which already means "marked absent" in participant view
    case "session":
      return isParticipantView
        ? entry.presentCount > 0 ? "#22c55e" : "#ef4444"
        : "#f97316";
  }
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
  }, [month, group, participantId]);

  const selectedParticipant = participants.find((p) => p.id === participantId);

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
              {data.days.filter((d) => d.dayType !== "off").length}
            </span> potential sessions
          </span>
          <span>
            <span className="font-medium text-green-600">
              {data.days.filter((d) => d.dayType === "session").length}
            </span> held
          </span>
          {data.days.filter((d) => d.dayType === "gap").length > 0 && (
            <span>
              <span className="font-medium" style={{ color: "#7c3aed" }}>
                {data.days.filter((d) => d.dayType === "gap").length}
              </span> gaps
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
                  return day ? new Date(day.date + "T12:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : label;
                }}
              />

              <Bar dataKey="presentCount" name="presentCount" radius={[3, 3, 0, 0]} minPointSize={4} label={{ position: "insideBottom", fontSize: 11, fill: "#ffffff" }}>
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
