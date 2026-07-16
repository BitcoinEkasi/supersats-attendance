export type DayType = "off" | "gap" | "session";

export type DayEntry = {
  date: string;
  label: string;
  weekday: string;
  presentCount: number;
  sessions: number;
  dayType: DayType;
  trend: number | null;
};

export type StatsData = {
  days: DayEntry[];
  totalParticipants: number;
  average: number;
  isParticipantView: boolean;
};
