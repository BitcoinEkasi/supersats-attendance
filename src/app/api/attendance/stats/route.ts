import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { isValidGroup, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";

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

  type DayEntry = { date: string; label: string; presentCount: number; sessions: number; trend: number | null };

  const baseDays: DayEntry[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      label: String(parseInt(date.split("-")[2], 10)),
      presentCount: data.presentCount,
      sessions: data.sessions,
      trend: null,
    }));

  const n = baseDays.length;

  const totalParticipants = participantId
    ? 1
    : await prisma.participant.count({
        where: {
          status: "ACTIVE",
          ...(group ? participantWhereForGroup(group) : {}),
        },
      });

  const average = n > 0 ? baseDays.reduce((sum, d) => sum + d.presentCount, 0) / n : 0;

  const days: DayEntry[] = baseDays.map((d, i) => ({ ...d, trend: null as number | null }));

  if (n >= 2) {
    const ys = baseDays.map((d) => d.presentCount);
    const meanX = (n - 1) / 2;
    const meanY = average;
    const denom = baseDays.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0);
    const slope = denom === 0 ? 0 : baseDays.reduce((acc, d, i) => acc + (i - meanX) * (d.presentCount - meanY), 0) / denom;
    const intercept = meanY - slope * meanX;
    for (let i = 0; i < n; i++) {
      days[i].trend = Math.max(0, Math.round((intercept + slope * i) * 10) / 10);
    }
  }

  return Response.json({
    days,
    totalParticipants,
    average: Math.round(average * 10) / 10,
    isParticipantView: !!participantId,
  });
}
