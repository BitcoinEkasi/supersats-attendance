import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getRecipients } from "@/lib/email";
import { getStartOfSASTToday, getEndOfSASTToday, getSASTDateString } from "@/lib/sast";
import { fmtDate, fmtWeekdayShort } from "@/lib/format-date";
import { fmtPct } from "@/lib/rewards";
import { getDivisionLabel } from "@/lib/sa-id";
import { shouldSendNow, markSent } from "@/lib/email-schedule";
import { TSK_GROUPS, TSK_GROUP_LABELS, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { getConsecutiveMissedCounts } from "@/lib/consecutive-missed";
import type { EmailRecipientCategory } from "@prisma/client";

type RosterRow = {
  surname: string;
  fullNames: string;
  knownAs: string | null;
  dateOfBirth: Date;
  gender: "MALE" | "FEMALE";
  tskStatus: string | null;
};

function formatRow(p: RosterRow): string {
  const name = p.knownAs ? `${p.surname}, ${p.fullNames} (${p.knownAs})` : `${p.surname}, ${p.fullNames}`;
  const division = getDivisionLabel(p.dateOfBirth, p.gender);
  const gender = p.gender === "MALE" ? "Male" : "Female";
  return `${name}, ${division}, ${gender}, ${p.tskStatus ?? "—"}`;
}

function renderSection(title: string, subtext: string | null, rows: RosterRow[]): string {
  const items = rows.length > 0
    ? `<ul>${rows.map((p) => `<li>${formatRow(p)}</li>`).join("")}</ul>`
    : "<p>None.</p>";
  return `<h3>${title}</h3>${subtext ? `<p>${subtext}</p>` : ""}${items}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" });
}

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { due, slot } = await shouldSendNow("TSK_ATTENDANCE");
  if (!due || !slot) {
    return Response.json({ sent: [], skipped: "not due yet" });
  }

  const todayStr = getSASTDateString();
  const todayStart = getStartOfSASTToday();
  const todayEnd = getEndOfSASTToday();
  const todayDate = new Date(`${todayStr}T12:00:00.000Z`); // matches Event/ExcusedSession noon-anchor convention

  const [events, excusedToday] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, group: { not: null } },
      select: { id: true, group: true, date: true },
    }),
    prisma.excusedSession.findMany({ where: { date: todayDate }, select: { group: true } }),
  ]);

  const excusedGroups = new Set(excusedToday.map((e) => e.group));
  const eventByGroup = new Map(events.map((e) => [e.group as string, e]));

  const claimed = await markSent(slot);
  if (!claimed) {
    return Response.json({ sent: [], skipped: "already handled today" });
  }

  const sent: string[] = [];

  for (const group of TSK_GROUPS) {
    if (excusedGroups.has(group)) continue;
    const event = eventByGroup.get(group);
    if (!event) continue;

    const [window, presentRecords] = await Promise.all([
      prisma.attendanceRecord.aggregate({
        where: { eventId: event.id },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),
      prisma.attendanceRecord.findMany({ where: { eventId: event.id, present: true }, select: { participantId: true } }),
    ]);
    if (!window._min.createdAt || !window._max.updatedAt) continue; // nothing captured for this group today

    const groupFilter = participantWhereForGroup(group as TskGroupKey);
    const roster = await prisma.participant.findMany({
      where: {
        registrationDate: { lte: event.date },
        OR: [{ status: "ACTIVE" as const }, { status: "RETIRED" as const, retiredAt: { gt: event.date } }],
        ...groupFilter,
      },
      select: { id: true, surname: true, fullNames: true, knownAs: true, dateOfBirth: true, gender: true, tskStatus: true },
    });

    const total = roster.length;
    const presentIds = new Set(presentRecords.map((r) => r.participantId));
    const present = roster.filter((p) => presentIds.has(p.id));
    const absent = roster.filter((p) => !presentIds.has(p.id));

    const historicalCounts = await getConsecutiveMissedCounts(absent.map((p) => p.id), todayStart);
    const absentUpTo3 = absent.filter((p) => 1 + (historicalCounts.get(p.id) ?? 0) <= 3);
    const alertOver3 = absent.filter((p) => 1 + (historicalCounts.get(p.id) ?? 0) > 3);

    const groupLabel = TSK_GROUP_LABELS[group];
    const pct = total > 0 ? (present.length / total) * 100 : 0;
    const html = `
      <p><strong>${groupLabel}</strong>, ${present.length}/${total} (${fmtPct(pct)}) present for ${fmtWeekdayShort(event.date)}, ${fmtDate(event.date)}</p>
      <p>Submitted by: ${groupLabel} Marshal</p>
      <p>Attendance captured between ${fmtTime(window._min.createdAt)} to ${fmtTime(window._max.updatedAt)}</p>
      ${renderSection("Present", null, present)}
      ${renderSection("Absent", "≤ 3 consecutive days", absentUpTo3)}
      ${renderSection("Alert", "> 3 consecutive days", alertOver3)}
    `;

    try {
      await sendEmail({
        to: await getRecipients(group as EmailRecipientCategory),
        subject: `✅TSK Attendance for the ${groupLabel}`,
        html,
      });
      sent.push(group);
    } catch (err) {
      console.error(`[check-tsk-attendance] email failed for ${group}:`, err);
    }
  }

  return Response.json({ sent });
}
