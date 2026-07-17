import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getAlertRecipients } from "@/lib/email";
import { TSK_GROUP_LABELS, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { fmtDate } from "@/lib/format-date";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";

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
  const [total, presentCount] = await Promise.all([
    prisma.participant.count({
      where: {
        registrationDate: { lte: event.date },
        OR: [{ status: "ACTIVE" }, { status: "RETIRED", retiredAt: { gte: event.date } }],
        ...groupFilter,
      },
    }),
    prisma.attendanceRecord.count({ where: { eventId, present: true } }),
  ]);

  const submittedAt = new Date();
  await prisma.event.update({ where: { id: eventId }, data: { submittedAt } });

  const groupLabel = event.group ? TSK_GROUP_LABELS[event.group] : "Unassigned";
  const timeStr = submittedAt.toLocaleTimeString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    await sendEmail({
      to: getAlertRecipients(),
      subject: `${groupLabel} ${presentCount}/${total} present — ${fmtDate(event.date)}`,
      html: `<p><strong>${groupLabel}</strong>: ${presentCount}/${total} present for the session on ${fmtDate(event.date)}.</p>
             <p>Submitted by ${user.name ?? "a marshal"} at ${timeStr} SAST.</p>`,
    });
  } catch (err) {
    // Attendance state is already saved — don't fail the request over an email hiccup.
    console.error("[events submit] email failed:", err);
  }

  return Response.json({ submittedAt, presentCount, total });
}
