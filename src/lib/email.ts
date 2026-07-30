import { Resend } from "resend";
import { prisma } from "@/lib/db";
import type { EmailRecipientCategory } from "@prisma/client";

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentId?: string }[];
}): Promise<void> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return;

  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    console.log("[email] dry-run (RESEND_API_KEY/EMAIL_FROM not set) —", {
      to: recipients,
      subject,
      attachments: attachments?.map((a) => a.filename),
    });
    return;
  }

  const { error } = await new Resend(apiKey).emails.send({ from, to: recipients, subject, html, attachments });
  if (error) {
    console.error("[email] send failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/** Recipients for one email category (a TSK group's TSK Attendance list, or the
 *  dedicated Zero Attendance list) — admin-managed via the Email Settings page. */
export async function getRecipients(category: EmailRecipientCategory): Promise<string[]> {
  const rows = await prisma.emailRecipient.findMany({ where: { category }, select: { email: true } });
  return rows.map((r) => r.email);
}
