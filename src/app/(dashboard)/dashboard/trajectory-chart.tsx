"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import type { MonthEntry, TrajectoryData } from "@/lib/types/attendance-stats";
import { GROUP_COLORS, TargetDashMarker } from "./attendance-chart";

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

/** Registered/70%-target markers: a dash + inline number per month, no connecting
 * line — a roster count is a discrete monthly snapshot, not something that should
 * read as continuously trending between points. Renders flat at y=1 for participant
 * scope (registered is hardcoded to 1 server-side), no special-case needed. */
function RosterLines() {
  return (
    <>
      <Line
        dataKey="registered"
        name="Registered"
        stroke="none"
        isAnimationActive={false}
        legendType="none"
        dot={(props: object) => <TargetDashMarker {...props} color="#3b82f6" formatLabel={(v) => `Total: ${v}`} />}
      />
      <Line
        dataKey={(m: MonthEntry) => Math.round(m.registered * 0.7)}
        name="70% Target"
        stroke="none"
        isAnimationActive={false}
        legendType="none"
        dot={(props: object) => <TargetDashMarker {...props} color="#16a34a" formatLabel={(v) => `Target: ${v} (70%)`} />}
      />
    </>
  );
}

function ratioText(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${numerator}/${denominator} (${Math.round((numerator / denominator) * 100)}%)`;
}

function TrajectoryTooltipContent({ active, payload, group }: TooltipContentProps & { group: string }) {
  if (!active || !payload?.length) return null;
  const m = payload[0]?.payload as MonthEntry | undefined;
  if (!m) return null;

  const gapText = m.gaps > 0 ? `, ${m.gaps} gap${m.gaps === 1 ? "" : "s"}` : "";
  const headerText = `${m.label} — ${m.held}/${m.potential} sessions held${gapText}`;

  const rows: { label: string; text: string; color: string; emphasize?: boolean }[] = [];
  if (!group) {
    // Top-of-stack-first (Free Surfers → Turtles), matching the itemSorter fix so the
    // tooltip list reads top-to-bottom the same way the visual stack does.
    for (let i = TSK_GROUPS.length - 1; i >= 0; i--) {
      const g = TSK_GROUPS[i];
      rows.push({
        label: TSK_GROUP_LABELS[g],
        text: ratioText(m.groupContributions?.[g] ?? 0, m.groupRegistered?.[g] ?? 0),
        color: GROUP_COLORS[g],
      });
    }
    rows.push({ label: "Total", text: ratioText(m.average, m.registered), color: "#000000", emphasize: true });
  } else {
    rows.push({
      label: TSK_GROUP_LABELS[group as TskGroupKey] ?? "Average",
      text: ratioText(m.average, m.registered),
      color: "#14b8a6", // matches the single Bar's hardcoded teal fill below
    });
  }

  return (
    <div className="recharts-default-tooltip" style={{ margin: 0, padding: 10, backgroundColor: "#fff", border: "1px solid #ccc", whiteSpace: "nowrap" }}>
      <p style={{ margin: 0 }}>{headerText}</p>
      <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
        {rows.map((r) => (
          <li
            key={r.label}
            style={{
              display: "block",
              paddingTop: 4,
              paddingBottom: r.emphasize ? 0 : 4,
              color: r.color,
              fontWeight: r.emphasize ? 600 : 400,
              borderTop: r.emphasize ? "1px solid #eee" : undefined,
              marginTop: r.emphasize ? 4 : 0,
            }}
          >
            {r.label} : {r.text}
          </li>
        ))}
      </ul>
    </div>
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
        <ComposedChart data={data.months} margin={{ top: 8, right: 24, left: 60, bottom: 0 }} barCategoryGap="50%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={(props) => <MonthAxisTick {...props} />} interval={0} height={28} />
          <YAxis hide domain={[0, Math.max(...data.months.map((m) => Math.max(m.average, m.registered))) + 2]} />
          <Tooltip
            content={data.isParticipantView ? undefined : (props) => <TrajectoryTooltipContent {...props} group={group} />}
            itemSorter={(item) => {
              // Reversed vs. the stack's bottom-to-top construction order (Turtles first),
              // so the hover list reads top-of-stack-first (Free Surfers) to bottom (Turtles) —
              // matching how the stack visually reads from top to bottom.
              const idx = TSK_GROUPS.findIndex((g) => TSK_GROUP_LABELS[g] === item.name);
              return idx === -1 ? TSK_GROUPS.length : TSK_GROUPS.length - 1 - idx;
            }}
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

          <RosterLines />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
