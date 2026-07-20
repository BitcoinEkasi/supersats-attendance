"use client";

import {
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import type { MonthEntry, TrajectoryData } from "@/lib/types/attendance-stats";
import { GROUP_COLORS } from "./attendance-chart";

function MonthAxisTick(props: { x?: string | number; y?: string | number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  const monthValue = payload?.value ?? "";
  const short = monthValue
    ? new Date(`${monthValue}-15T12:00:00Z`).toLocaleString("en-ZA", { month: "short", year: "2-digit" })
    : "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={11} textAnchor="middle" fontSize={11} fill="#374151">{short}</text>
    </g>
  );
}

function MonthBarLabel(props: { x?: string | number; y?: string | number; width?: string | number; value?: React.ReactNode }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const v = typeof props.value === "number" ? props.value : Number(props.value ?? 0);
  if (!v) return null;
  return (
    <text x={x + width / 2} y={y} dy={-4} textAnchor="middle" fontSize={11} fill="#000000">
      {v}
    </text>
  );
}

export default function TrajectoryChart({ data, group }: { data: TrajectoryData; group: string }) {
  if (data.months.every((m) => m.average === 0)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
        No sessions recorded in the last 12 months
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: "7.5%", paddingRight: "7.5%" }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data.months} margin={{ top: 8, right: 24, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={(props) => <MonthAxisTick {...props} />} interval={0} height={28} />
          <YAxis hide domain={[0, Math.max(data.totalParticipants, ...data.months.map((m) => m.average)) + 2]} />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value);
              if (name === "average") return [v, data.isParticipantView ? "Avg attendance" : "Avg attendees"];
              return [v, String(name)];
            }}
            labelFormatter={(label) => {
              const m = data.months.find((entry) => entry.month === label);
              if (!m) return label;
              const gapText = m.gaps > 0 ? `, ${m.gaps} gap${m.gaps === 1 ? "" : "s"}` : "";
              return `${m.label} — ${m.held}/${m.potential} sessions held${gapText}`;
            }}
          />

          {group ? (
            <Bar dataKey="average" name="average" fill="#14b8a6" radius={[3, 3, 0, 0]} minPointSize={4} label={(props) => <MonthBarLabel {...props} />} />
          ) : (
            <>
              {TSK_GROUPS.map((g, i) => (
                <Bar
                  key={g}
                  dataKey={(m: MonthEntry) => m.groupContributions?.[g] ?? 0}
                  name={TSK_GROUP_LABELS[g]}
                  stackId="groups"
                  fill={GROUP_COLORS[g]}
                  minPointSize={2}
                  radius={i === TSK_GROUPS.length - 1 ? [3, 3, 0, 0] : undefined}
                  label={i === TSK_GROUPS.length - 1 ? (props) => <MonthBarLabel {...props} value={data.months[props.index ?? 0]?.average} /> : undefined}
                />
              ))}
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
                itemSorter={(item) => {
                  const idx = TSK_GROUPS.findIndex((g) => TSK_GROUP_LABELS[g] === item.value);
                  return idx === -1 ? TSK_GROUPS.length : idx;
                }}
              />
            </>
          )}

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
  );
}
