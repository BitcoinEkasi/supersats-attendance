import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getAlertRecipients } from "@/lib/email";
import { getStartOfSASTToday, getEndOfSASTToday, getSASTDateString, isProgrammeDay } from "@/lib/sast";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = getSASTDateString();
  if (!isProgrammeDay(todayStr)) {
    return Response.json({ checked: 0, zeroGroups: [], skipped: "not a programme day" });
  }

  const todayStart = getStartOfSASTToday();
  const todayEnd = getEndOfSASTToday();
  const todayDate = new Date(`${todayStr}T12:00:00.000Z`); // matches Event/ExcusedSession noon-anchor convention

  const [events, excusedToday] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, group: { not: null } },
      select: { id: true, group: true },
    }),
    prisma.excusedSession.findMany({ where: { date: todayDate }, select: { group: true } }),
  ]);

  const excusedGroups = new Set(excusedToday.map((e) => e.group));
  const eventByGroup = new Map(events.map((e) => [e.group as string, e.id]));

  const zeroGroups: string[] = [];
  for (const group of TSK_GROUPS) {
    if (excusedGroups.has(group)) continue;
    const eventId = eventByGroup.get(group);
    if (!eventId) {
      zeroGroups.push(group);
      continue;
    }
    const presentCount = await prisma.attendanceRecord.count({ where: { eventId, present: true } });
    if (presentCount === 0) zeroGroups.push(group);
  }

  if (zeroGroups.length > 0) {
    const html = `<h2>Zero-attendance alert — ${todayStr}</h2><ul>${zeroGroups
      .map((g) => `<li><strong>${TSK_GROUP_LABELS[g]}</strong> — no participants marked present yet today.</li>`)
      .join("")}</ul>`;
    try {
      await sendEmail({
        to: getAlertRecipients(),
        subject: `Zero attendance: ${zeroGroups.map((g) => TSK_GROUP_LABELS[g]).join(", ")}`,
        html,
      });
    } catch (err) {
      console.error("[check-zero-attendance] email failed:", err);
      return Response.json({ error: "Email send failed", zeroGroups }, { status: 500 });
    }
  }

  return Response.json({ checked: TSK_GROUPS.length, zeroGroups });
}
