import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail, getRecipients } from "@/lib/email";
import { getSASTNow, getSASTTimeOfDay } from "@/lib/sast";
import { getTopupSettings, getRemainingSessions, computeTopupForecast, buildTopupEmail } from "@/lib/topup-forecast";

// Don't send overnight — the cron polls every minute, so the first poll from this hour sends.
const SEND_FROM_HOUR_SAST = 8;

/**
 * Monthly reserve top-up request. Polled every minute by the server cron (CRON_SECRET);
 * sends once per month, as soon as N or fewer sessions are left. An admin can POST with
 * ?force=1 to send right away (still marks the month as sent).
 */
export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && bearer === cronSecret;
  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const force = !isCron && new URL(req.url).searchParams.get("force") === "1";

  const settings = await getTopupSettings();
  const { year, month: m } = getSASTNow();
  const month = `${year}-${String(m).padStart(2, "0")}`;

  if (!force) {
    if (!settings.enabled) return Response.json({ skipped: "disabled" });
    if (settings.lastSentMonth === month) return Response.json({ skipped: "already sent this month" });
    if (getSASTTimeOfDay().hour < SEND_FROM_HOUR_SAST) return Response.json({ skipped: "before send hour" });
    const { maxRemaining } = await getRemainingSessions(month);
    if (maxRemaining > settings.remainingSessions) {
      return Response.json({ skipped: "not due yet", remainingSessions: maxRemaining, threshold: settings.remainingSessions });
    }
  }

  const recipients = await getRecipients("TOPUP_REQUEST");
  if (recipients.length === 0) return Response.json({ skipped: "no recipients configured" });

  // Claim the month atomically so overlapping polls can't double-send
  const previous = settings.lastSentMonth;
  if (!force) {
    const { count } = await prisma.topupForecastSettings.updateMany({
      where: { id: "default", OR: [{ lastSentMonth: null }, { lastSentMonth: { not: month } }] },
      data: { lastSentMonth: month },
    });
    if (count === 0) return Response.json({ skipped: "already sent this month" });
  }

  try {
    const forecast = await computeTopupForecast(month, settings.contingencyPercent);
    const { subject, html } = buildTopupEmail(forecast);
    await sendEmail({ to: recipients, subject, html });
    if (force) await prisma.topupForecastSettings.update({ where: { id: "default" }, data: { lastSentMonth: month } });
    console.log(`[topup-forecast] ${month}: sent "${subject}" to ${recipients.length} recipient(s)`);
    return Response.json({ sent: true, subject, recipients: recipients.length, forecast });
  } catch (err: any) {
    console.error("[topup-forecast] failed:", err);
    // Release the claim so the next poll retries
    if (!force) {
      await prisma.topupForecastSettings.updateMany({ where: { id: "default", lastSentMonth: month }, data: { lastSentMonth: previous } });
    }
    return Response.json({ error: `Top-up request failed: ${err.message}` }, { status: 500 });
  }
}
