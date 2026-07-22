import { prisma } from "@/lib/db";
import { getSASTDateString, getSASTTimeOfDay, isProgrammeDay, isSaturdaySAST } from "@/lib/sast";
import type { EmailScheduleSlot } from "@prisma/client";

export type EmailType = "ZERO_ATTENDANCE" | "TSK_PULSE";

// Matches the current hardcoded cron times — used only as a fallback if the seeded
// EmailSchedule row is somehow missing, so a missing row can never silently stop emails.
const DEFAULTS: Record<EmailScheduleSlot, { hour: number; minute: number }> = {
  ZERO_ATTENDANCE_WEEKDAY: { hour: 15, minute: 0 },
  ZERO_ATTENDANCE_SATURDAY: { hour: 10, minute: 0 },
  TSK_PULSE_WEEKDAY: { hour: 19, minute: 0 },
  TSK_PULSE_SATURDAY: { hour: 19, minute: 0 },
};

function slotFor(emailType: EmailType, todayStr: string): EmailScheduleSlot {
  const suffix = isSaturdaySAST(todayStr) ? "SATURDAY" : "WEEKDAY";
  return `${emailType}_${suffix}` as EmailScheduleSlot;
}

/**
 * Whether a scheduled email is due right now. Sun/Mon are never valid days for either
 * email (isProgrammeDay). Otherwise picks the weekday/Saturday slot, compares the current
 * SAST time against the configured send time, and checks it hasn't already sent today.
 */
export async function shouldSendNow(emailType: EmailType): Promise<{ due: boolean; slot: EmailScheduleSlot | null }> {
  const todayStr = getSASTDateString();
  if (!isProgrammeDay(todayStr)) return { due: false, slot: null };

  const slot = slotFor(emailType, todayStr);
  const row = await prisma.emailSchedule.findUnique({ where: { slot } });
  if (!row) console.warn(`[email-schedule] no EmailSchedule row for slot ${slot}, using hardcoded default`);
  const target = row ?? { hour: DEFAULTS[slot].hour, minute: DEFAULTS[slot].minute, lastSentDate: null as string | null };

  if (target.lastSentDate === todayStr) return { due: false, slot };

  const { hour: nowH, minute: nowM } = getSASTTimeOfDay();
  const due = nowH > target.hour || (nowH === target.hour && nowM >= target.minute);
  return { due, slot };
}

/**
 * Atomically claims today's send for `slot` — returns true if this call won the claim, so
 * the caller should proceed; false if another concurrent request already claimed today
 * (e.g. a manual workflow_dispatch overlapping a scheduled poll). The `OR` here is
 * required: SQL's `<> today` does not match a NULL lastSentDate under three-valued logic,
 * so a plain `{ not: today }` filter would never successfully claim a never-sent row.
 */
export async function markSent(slot: EmailScheduleSlot): Promise<boolean> {
  const todayStr = getSASTDateString();
  const result = await prisma.emailSchedule.updateMany({
    where: { slot, OR: [{ lastSentDate: null }, { lastSentDate: { not: todayStr } }] },
    data: { lastSentDate: todayStr },
  });
  return result.count === 1;
}
