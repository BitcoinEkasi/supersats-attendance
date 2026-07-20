import type { TskGroupKey } from "@/lib/tsk-groups";

export type DayType = "off" | "gap" | "session" | "excused" | "future";

export type DayEntry = {
  date: string;
  label: string;
  weekday: string;
  activity: string;
  presentCount: number;
  sessions: number;
  dayType: DayType;
  trend: number | null;
  excuseReason: string | null;
  excuseReasonOther: string | null;
  /** Per-group present counts for this day — populated only in the "All Groups" (no group/participant filter) view. */
  groupCounts: Record<TskGroupKey, number> | null;
};

export type StatsData = {
  days: DayEntry[];
  totalParticipants: number;
  average: number;
  isParticipantView: boolean;
  trendSlope: number | null;
};
