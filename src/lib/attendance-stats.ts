import { prisma } from "@/lib/db";
import { getStartOfSASTMonth, getEndOfSASTMonth, getDaysInSASTMonth, isProgrammeDay, getSASTDateString } from "@/lib/sast";
import { fmtDayNumber, fmtWeekdayShort } from "@/lib/format-date";
import { participantWhereForGroup, TSK_GROUPS, type TskGroupKey } from "@/lib/tsk-groups";
import { CATEGORY_SHORT_LABELS } from "@/lib/event-categories";
import { getExcuseCategory } from "@/lib/excused-session-reasons";
import type { DayEntry, DayType, StatsData } from "@/lib/types/attendance-stats";

export type ComputeAttendanceStatsParams = {
  month: string; // "YYYY-MM"
  group?: TskGroupKey;
  participantId?: string;
};

export async function computeAttendanceStats({
  month,
  group,
  participantId,
}: ComputeAttendanceStatsParams): Promise<StatsData> {
  const start = getStartOfSASTMonth(month);
  const end = getEndOfSASTMonth(month);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(group ? { group } : {}),
      ...(participantId ? { attendanceRecords: { some: { participantId } } } : {}),
    },
    include: participantId
      ? { attendanceRecords: { where: { participantId } } }
      : { _count: { select: { attendanceRecords: { where: { present: true } } } } },
    orderBy: { date: "asc" },
  });

  // Excuse flags are group-specific and only meaningful once a group is selected.
  const excusedSessions = group
    ? await prisma.excusedSession.findMany({
        where: { date: { gte: start, lte: end }, group },
        select: { date: true, reason: true, reasonOther: true },
      })
    : [];
  const excuseMap = new Map(
    excusedSessions.map((e) => [e.date.toISOString().split("T")[0], e])
  );

  // Per-group breakdown only makes sense in the unfiltered "All Groups" view.
  const includeGroupBreakdown = !group && !participantId;
  const dayMap = new Map<string, { presentCount: number; sessions: number; categories: Set<string> }>();
  const groupDayMap = new Map<string, Map<string, number>>();
  for (const event of events) {
    const dateStr = event.date.toISOString().split("T")[0];
    const existing = dayMap.get(dateStr) ?? { presentCount: 0, sessions: 0, categories: new Set<string>() };
    let presentDelta: number;
    if (participantId) {
      const rec = (event as typeof event & { attendanceRecords: { present: boolean }[] }).attendanceRecords[0];
      presentDelta = rec?.present ? 1 : 0;
    } else {
      presentDelta = (event as typeof event & { _count: { attendanceRecords: number } })._count.attendanceRecords;
    }
    existing.presentCount += presentDelta;
    existing.sessions += 1;
    existing.categories.add(event.category);
    dayMap.set(dateStr, existing);

    if (includeGroupBreakdown && event.group) {
      const inner = groupDayMap.get(dateStr) ?? new Map<string, number>();
      inner.set(event.group, (inner.get(event.group) ?? 0) + presentDelta);
      groupDayMap.set(dateStr, inner);
    }
  }

  const todayStr = getSASTDateString();
  const allDates = getDaysInSASTMonth(month);
  const baseDays: DayEntry[] = allDates.map((date) => {
    const agg = dayMap.get(date) ?? { presentCount: 0, sessions: 0, categories: new Set<string>() };
    const excuse = excuseMap.get(date);
    const dayType: DayType = agg.sessions > 0
      ? "session"
      : date > todayStr
      ? "future"
      : excuse && getExcuseCategory(excuse.reason) === "excused"
      ? "excused"
      : isProgrammeDay(date) ? "gap" : "off";
    const d = new Date(`${date}T12:00:00.000Z`);
    const activity = agg.categories.size === 1
      ? CATEGORY_SHORT_LABELS[[...agg.categories][0]] ?? [...agg.categories][0]
      : agg.categories.size > 1 ? "Multi" : "";
    return {
      date,
      label: fmtDayNumber(d),
      weekday: fmtWeekdayShort(d),
      activity,
      presentCount: agg.presentCount,
      sessions: agg.sessions,
      dayType,
      trend: null,
      excuseReason: excuse?.reason ?? null,
      excuseReasonOther: excuse?.reasonOther ?? null,
      groupCounts: includeGroupBreakdown
        ? (Object.fromEntries(TSK_GROUPS.map((g) => [g, groupDayMap.get(date)?.get(g) ?? 0])) as Record<TskGroupKey, number>)
        : null,
    };
  });

  const totalParticipants = participantId
    ? 1
    : await prisma.participant.count({
        where: {
          status: "ACTIVE",
          ...(group ? participantWhereForGroup(group) : {}),
        },
      });

  const sessionDays = baseDays.filter((d) => d.dayType === "session");
  const average = sessionDays.length > 0
    ? sessionDays.reduce((sum, d) => sum + d.presentCount, 0) / sessionDays.length
    : 0;

  const n = sessionDays.length;

  const days: DayEntry[] = baseDays.map((d) => ({ ...d }));
  let trendSlope: number | null = null;

  if (n >= 2) {
    const ys = sessionDays.map((d) => d.presentCount);
    const meanX = (n - 1) / 2;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const denom = sessionDays.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0);
    const slope = denom === 0 ? 0 : sessionDays.reduce((acc, d, i) => acc + (i - meanX) * (d.presentCount - meanY), 0) / denom;
    const intercept = meanY - slope * meanX;
    trendSlope = slope;
    let i = 0;
    for (const day of days) {
      if (day.dayType !== "session") continue;
      day.trend = Math.max(0, Math.round((intercept + slope * i) * 10) / 10);
      i++;
    }
  }

  return {
    days,
    totalParticipants,
    average: Math.floor(average),
    isParticipantView: !!participantId,
    trendSlope,
  };
}
