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
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import { getSASTNow } from "@/lib/sast";

type DayEntry = {
  date: string;
  label: string;
  presentCount: number;
  sessions: number;
  trend: number | null;
};

type StatsData = {
  days: DayEntry[];
  totalParticipants: number;
  average: number;
  isParticipantView: boolean;
};

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
      <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>
            <span className="font-medium text-gray-900">{data.days.length}</span> session days
          </span>
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

      {!loading && data && data.days.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          No sessions recorded for this period
        </div>
      )}

      {!loading && data && data.days.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.days} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, Math.max(data.totalParticipants, ...(data.days.map(d => d.presentCount))) + 2]} />
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : Number(value);
                if (name === "trend") return [v.toFixed(1), "Trend"];
                if (name === "presentCount") return [v, data.isParticipantView ? "Present" : "Attended"];
                return [v, String(name)];
              }}
              labelFormatter={(label) => {
                const day = data.days.find((d) => d.label === label);
                return day ? new Date(day.date + "T12:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : label;
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === "presentCount") return data.isParticipantView ? "Present" : "Attended";
                if (value === "trend") return "Trend (regression)";
                return value;
              }}
            />

            <Bar dataKey="presentCount" name="presentCount" radius={[3, 3, 0, 0]}>
              {data.days.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    data.isParticipantView
                      ? entry.presentCount > 0 ? "#22c55e" : "#ef4444"
                      : "#f97316"
                  }
                />
              ))}
            </Bar>

            <ReferenceLine
              y={data.totalParticipants}
              stroke="#3b82f6"
              strokeWidth={1.5}
              label={{ value: `Registered: ${data.totalParticipants}`, position: "insideTopRight", fontSize: 11, fill: "#3b82f6" }}
            />

            <ReferenceLine
              y={data.average}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{ value: `Avg: ${data.average}`, position: "insideBottomRight", fontSize: 11, fill: "#9ca3af" }}
            />

            {data.days.some((d) => d.trend !== null) && (
              <Line
                dataKey="trend"
                name="trend"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
