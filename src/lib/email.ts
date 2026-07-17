import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

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
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass || !from) {
    console.log("[email] dry-run (SMTP_HOST/SMTP_USER/SMTP_PASSWORD/EMAIL_FROM not set) —", { to: recipients, subject });
    return;
  }

  try {
    await getTransporter().sendMail({ from, to: recipients, subject, html });
  } catch (err) {
    console.error("[email] send failed:", err);
    throw new Error(`Failed to send email: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Comma-separated recipient list shared by all attendance notification features. */
export function getAlertRecipients(): string[] {
  return (process.env.ATTENDANCE_ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
