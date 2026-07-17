export type DayType = "off" | "gap" | "session" | "excused";

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
};

export type StatsData = {
  days: DayEntry[];
  totalParticipants: number;
  average: number;
  isParticipantView: boolean;
};
