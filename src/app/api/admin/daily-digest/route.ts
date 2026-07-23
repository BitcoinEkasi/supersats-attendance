import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getAlertRecipients } from "@/lib/email";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { getSASTNow, getSASTDateString, formatPulseDate } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";
import { shouldSendNow, markSent } from "@/lib/email-schedule";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import { getAbsenceBadgeGroups, type AbsenceBadgeEntry } from "@/lib/absence-badges";
import { AbsenceBadgeDocument } from "@/lib/absence-badge-pdf";
import type { StatsData } from "@/lib/types/attendance-stats";

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { due, slot } = await shouldSendNow("TSK_PULSE");
  if (!due || !slot) {
    return Response.json({ sent: false, skipped: "not due yet" });
  }

  const { year, month } = getSASTNow();
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const badgeGroups = await getAbsenceBadgeGroups();
  const flagsByGroup = new Map<string, AbsenceBadgeEntry[]>();
  for (const g of badgeGroups) {
    if (!g.group) continue;
    flagsByGroup.set(g.group, g.entries);
  }

  const sections = await Promise.all(
    TSK_GROUPS.map(async (group) => {
      const stats = await computeAttendanceStats({ month: monthStr, group: group as TskGroupKey });
      return renderGroupSection(group, stats, flagsByGroup.get(group) ?? []);
    }),
  );

  const html = `<h1>TSK Attendance Digest — ${monthStr}</h1>${sections.join("<hr/>")}`;

  const claimed = await markSent(slot);
  if (!claimed) return Response.json({ sent: false, skipped: "already handled today" });

  const recipients = await getAlertRecipients();
  if (recipients.length === 0) return Response.json({ sent: false, reason: "no recipients configured" });

  let attachments: { filename: string; content: Buffer }[] | undefined;
  if (badgeGroups.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = React.createElement(AbsenceBadgeDocument, { generatedAt: fmtDate(new Date()), groups: badgeGroups }) as any;
    const pdfBuffer = await renderToBuffer(el);
    attachments = [{ filename: `absence-badges-${getSASTDateString()}.pdf`, content: pdfBuffer }];
  }

  try {
    await sendEmail({ to: recipients, subject: `TSK Pulse ${formatPulseDate(getSASTDateString())}`, html, attachments });
  } catch (err) {
    console.error("[daily-digest] email failed:", err);
    return Response.json({ sent: false }, { status: 500 });
  }
  return Response.json({ sent: true, groups: TSK_GROUPS.length });
}

function renderGroupSection(group: string, stats: StatsData, flags: AbsenceBadgeEntry[]): string {
  const label = TSK_GROUP_LABELS[group];
  const held = stats.days.filter((d) => d.dayType === "session").length;
  const potential = stats.days.filter((d) => d.dayType !== "off" && d.dayType !== "excused" && d.dayType !== "future").length;
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
          .map((f) => `${f.knownAs ?? f.fullNames} ${f.surname} (${f.consecutiveMissed} missed)`)
          .join(", ")}</p>`
      : ""}
  `;
}
