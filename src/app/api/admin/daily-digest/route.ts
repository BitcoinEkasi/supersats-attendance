import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getAlertRecipients } from "@/lib/email";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { getSASTNow } from "@/lib/sast";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import type { StatsData } from "@/lib/types/attendance-stats";

type FlagRow = { consecutiveMissed: number; participant: { surname: string; fullNames: string; knownAs: string | null } };

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, month } = getSASTNow();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const flags = await prisma.absenceFlag.findMany({
    include: { participant: { select: { surname: true, fullNames: true, knownAs: true } } },
  });
  const flagsByGroup = new Map<string, FlagRow[]>();
  for (const f of flags) {
    if (!f.group) continue;
    const list = flagsByGroup.get(f.group) ?? [];
    list.push(f);
    flagsByGroup.set(f.group, list);
  }

  const sections = await Promise.all(
    TSK_GROUPS.map(async (group) => {
      const stats = await computeAttendanceStats({ month: monthStr, group: group as TskGroupKey });
      return renderGroupSection(group, stats, flagsByGroup.get(group) ?? []);
    }),
  );

  const html = `<h1>TSK Attendance Digest — ${monthStr}</h1>${sections.join("<hr/>")}`;

  const recipients = getAlertRecipients();
  if (recipients.length === 0) return Response.json({ sent: false, reason: "no recipients configured" });

  try {
    await sendEmail({ to: recipients, subject: `TSK Daily Digest — ${monthStr}`, html });
  } catch (err) {
    console.error("[daily-digest] email failed:", err);
    return Response.json({ sent: false }, { status: 500 });
  }
  return Response.json({ sent: true, groups: TSK_GROUPS.length });
}

function renderGroupSection(group: string, stats: StatsData, flags: FlagRow[]): string {
  const label = TSK_GROUP_LABELS[group];
  const held = stats.days.filter((d) => d.dayType === "session").length;
  const potential = stats.days.filter((d) => d.dayType !== "off" && d.dayType !== "excused").length;
  const gaps = stats.days.filter((d) => d.dayType === "gap");

  const trendLabel =
    stats.trendSlope == null ? "Not enough data yet"
    : stats.trendSlope < -0.05 ? "Declining"
    : stats.trendSlope > 0.05 ? "Improving"
    : "Stable";

  return `
    <h2>${label}</h2>
    <p>${held}/${potential} sessions held month-to-date. Avg attendees: ${stats.average} / ${stats.totalParticipants} registered.</p>
    <p><strong>Trend:</strong> ${trendLabel}</p>
    ${gaps.length
      ? `<p><strong>Missed opportunities (gap days):</strong> ${gaps.map((g) => g.date).join(", ")}</p>`
      : `<p>No gap days this month.</p>`}
    ${flags.length
      ? `<p><strong>Absence alerts:</strong> ${flags
          .map((f) => `${f.participant.knownAs ?? f.participant.fullNames} ${f.participant.surname} (${f.consecutiveMissed} missed)`)
          .join(", ")}</p>`
      : ""}
  `;
}
