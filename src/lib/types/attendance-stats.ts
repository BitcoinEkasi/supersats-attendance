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
  /** Per-group event counts for this day (not headcount — how many events that group held) — populated only in the "All Groups" view. Used to give each group its own session-day denominator instead of diluting it with other groups' calendars. */
  groupSessions: Record<TskGroupKey, number> | null;
  /** Historical roster size as of this day (always 1 for participant scope). */
  registered: number;
  /** Per-group historical roster breakdown as of this day — populated only in the "All Groups" view. */
  groupRegistered: Record<TskGroupKey, number> | null;
};

export type WeightedAttendance = { attended: number; totalEvents: number };

export type StatsData = {
  days: DayEntry[];
  totalParticipants: number;
  /** Floored to a whole number — used by the daily digest email. */
  average: number;
  /** Same average, rounded to 2 decimal places — used by the Pulse header. */
  averagePrecise: number;
  isParticipantView: boolean;
  trendSlope: number | null;
};

export type MonthEntry = {
  month: string; // "YYYY-MM"
  label: string;
  average: number;
  held: number;
  potential: number;
  gaps: number;
  /** Per-group average contribution to `average` — populated only in the "All Groups" view. */
  groupContributions: Record<TskGroupKey, number> | null;
  /** Historical roster size as of this month (always 1 for participant scope). */
  registered: number;
  /** Per-group historical roster breakdown as of this month — populated only in the "All Groups" view. */
  groupRegistered: Record<TskGroupKey, number> | null;
  /** Weighted attendance (sum attended / sum eligible sessions across participants) — same
   *  methodology as Monthly Report's Average Attendance. This is what the tooltip's percentage
   *  is computed from; `average`/`groupContributions` above remain a separate headcount metric
   *  driving the bar heights. */
  weightedAverage: WeightedAttendance;
  /** Per-group weighted attendance — populated only in the "All Groups" view. */
  groupWeightedAverages: Record<TskGroupKey, WeightedAttendance> | null;
};

export type TrajectoryData = {
  months: MonthEntry[];
  isParticipantView: boolean;
};
