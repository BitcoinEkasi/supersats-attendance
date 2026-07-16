import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getStartOfSASTMonth, getEndOfSASTMonth, getDaysInSASTMonth, isProgrammeDay } from "@/lib/sast";
import { fmtDayWithWeekday } from "@/lib/format-date";
import { isValidGroup, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";
import type { DayEntry, DayType } from "@/lib/types/attendance-stats";

export async function GET(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const groupParam = searchParams.get("group");
  const participantId = searchParams.get("participantId") ?? undefined;

  if (!month) return Response.json({ error: "month is required" }, { status: 400 });

  const group = groupParam && isValidGroup(groupParam) ? (groupParam as TskGroupKey) : undefined;
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

  const dayMap = new Map<string, { presentCount: number; sessions: number }>();
  for (const event of events) {
    const dateStr = event.date.toISOString().split("T")[0];
    const existing = dayMap.get(dateStr) ?? { presentCount: 0, sessions: 0 };
    if (participantId) {
      const rec = (event as typeof event & { attendanceRecords: { present: boolean }[] }).attendanceRecords[0];
      existing.presentCount += rec?.present ? 1 : 0;
    } else {
      existing.presentCount += (event as typeof event & { _count: { attendanceRecords: number } })._count.attendanceRecords;
    }
    existing.sessions += 1;
    dayMap.set(dateStr, existing);
  }

  const allDates = getDaysInSASTMonth(month);
  const baseDays: DayEntry[] = allDates.map((date) => {
    const agg = dayMap.get(date) ?? { presentCount: 0, sessions: 0 };
    const dayType: DayType = agg.sessions > 0 ? "session" : isProgrammeDay(date) ? "gap" : "off";
    return {
      date,
      label: fmtDayWithWeekday(new Date(`${date}T12:00:00.000Z`)),
      presentCount: agg.presentCount,
      sessions: agg.sessions,
      dayType,
      trend: null,
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

  const programmeDays = baseDays.filter((d) => d.dayType !== "off");
  const n = programmeDays.length;

  const days: DayEntry[] = baseDays.map((d) => ({ ...d }));

  if (n >= 2) {
    const ys = programmeDays.map((d) => d.presentCount);
    const meanX = (n - 1) / 2;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const denom = programmeDays.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0);
    const slope = denom === 0 ? 0 : programmeDays.reduce((acc, d, i) => acc + (i - meanX) * (d.presentCount - meanY), 0) / denom;
    const intercept = meanY - slope * meanX;
    let i = 0;
    for (const day of days) {
      if (day.dayType === "off") continue;
      day.trend = Math.max(0, Math.round((intercept + slope * i) * 10) / 10);
      i++;
    }
  }

  return Response.json({
    days,
    totalParticipants,
    average: Math.round(average * 10) / 10,
    isParticipantView: !!participantId,
  });
}
