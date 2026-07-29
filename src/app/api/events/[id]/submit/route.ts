import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getRecipients } from "@/lib/email";
import { TSK_GROUP_LABELS, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { fmtDate, fmtWeekdayShort } from "@/lib/format-date";
import { fmtPct } from "@/lib/rewards";
import { getDivisionLabel } from "@/lib/sa-id";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";
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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHAL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  // Mirror the same restriction page.tsx already applies to marshals viewing this event.
  if (user.role === "MARSHAL") {
    const todayStart = getStartOfSASTToday();
    const todayEnd = getEndOfSASTToday();
    if (event.date < todayStart || event.date > todayEnd) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.group && event.group && event.group !== user.group) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const groupFilter = event.group ? participantWhereForGroup(event.group as TskGroupKey) : {};
  const eligibilityFilter = {
    registrationDate: { lte: event.date },
    OR: [{ status: "ACTIVE" as const }, { status: "RETIRED" as const, retiredAt: { gt: event.date } }],
    ...groupFilter,
  };

  const [roster, presentRecords] = await Promise.all([
    prisma.participant.findMany({
      where: eligibilityFilter,
      select: { id: true, surname: true, fullNames: true, knownAs: true, dateOfBirth: true, gender: true, tskStatus: true },
    }),
    prisma.attendanceRecord.findMany({ where: { eventId, present: true }, select: { participantId: true } }),
  ]);

  const total = roster.length;
  const presentIds = new Set(presentRecords.map((r) => r.participantId));
  const present = roster.filter((p) => presentIds.has(p.id));
  const absent = roster.filter((p) => !presentIds.has(p.id));

  const submittedAt = new Date();
  await prisma.event.update({ where: { id: eventId }, data: { submittedAt } });

  const timeStr = submittedAt.toLocaleTimeString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
  });

  // TSK Attendance is per-group; "Unassigned" events (legacy/admin marshal spanning all
  // groups) have no single group recipient list, so no email is sent for them.
  if (!event.group) {
    return Response.json({ submittedAt, presentCount: present.length, total });
  }

  const groupLabel = TSK_GROUP_LABELS[event.group];

  // Consecutive-missed as of right now (including today's just-recorded absence) — this
  // is computed fresh, not read from AbsenceFlag, which only refreshes on its nightly
  // cron and would not yet reflect this submission.
  const historicalCounts = await getConsecutiveMissedCounts(
    absent.map((p) => p.id),
    getStartOfSASTToday(),
  );
  const absentUpTo3 = absent.filter((p) => 1 + (historicalCounts.get(p.id) ?? 0) <= 3);
  const alertOver3 = absent.filter((p) => 1 + (historicalCounts.get(p.id) ?? 0) > 3);

  const pct = total > 0 ? (present.length / total) * 100 : 0;
  const html = `
    <p><strong>${groupLabel}</strong>, ${present.length}/${total} (${fmtPct(pct)}) present for ${fmtWeekdayShort(event.date)}, ${fmtDate(event.date)}</p>
    <p>Submitted by: ${user.name ?? "a marshal"} at ${timeStr} SAST</p>
    ${renderSection("Present", null, present)}
    ${renderSection("Absent", "≤ 3 consecutive days", absentUpTo3)}
    ${renderSection("Alert", "> 3 consecutive days", alertOver3)}
  `;

  try {
    await sendEmail({
      to: await getRecipients(event.group as EmailRecipientCategory),
      subject: `✅TSK Attendance for the ${groupLabel}`,
      html,
    });
  } catch (err) {
    // Attendance state is already saved — don't fail the request over an email hiccup.
    console.error("[events submit] email failed:", err);
  }

  return Response.json({ submittedAt, presentCount: present.length, total });
}
