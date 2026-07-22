import { Resend } from "resend";
import { prisma } from "@/lib/db";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return;

  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    console.log("[email] dry-run (RESEND_API_KEY/EMAIL_FROM not set) —", { to: recipients, subject });
    return;
  }

  const { error } = await new Resend(apiKey).emails.send({ from, to: recipients, subject, html });
  if (error) {
    console.error("[email] send failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/** Recipient list shared by all attendance notification features. Admin-managed via the
 *  EmailRecipient table; falls back to the ATTENDANCE_ALERT_RECIPIENTS env var only when
 *  the table is empty (i.e. before an admin has added anyone through the settings UI). */
export async function getAlertRecipients(): Promise<string[]> {
  const rows = await prisma.emailRecipient.findMany({ select: { email: true } });
  if (rows.length > 0) return rows.map((r) => r.email);

  return (process.env.ATTENDANCE_ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
