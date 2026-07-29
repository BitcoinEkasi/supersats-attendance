import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import EmailRecipientsForm from "./email-recipients-form";
import EmailScheduleForm from "./email-schedule-form";
import { TSK_GROUPS, TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import type { EmailRecipientCategory } from "@prisma/client";

const RECIPIENT_CATEGORIES: { category: EmailRecipientCategory; title: string; description: string }[] = [
  {
    category: "ZERO_ATTENDANCE",
    title: "Zero Attendance Alert",
    description: "One alert that can flag several groups at once — goes to this dedicated list, not the per-group lists below.",
  },
  ...TSK_GROUPS.map((group) => ({
    category: group as EmailRecipientCategory,
    title: `TSK Attendance — ${TSK_GROUP_LABELS[group]}`,
    description: `Sent to this list when TSK Attendance runs (see Email Scheduler above) if a ${TSK_GROUP_LABELS[group]} session was captured that day.`,
  })),
];

export default async function EmailSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const [recipients, schedules] = await Promise.all([
    prisma.emailRecipient.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.emailSchedule.findMany(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Email Settings</h2>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Email Scheduler</h3>
        <p className="mb-4 text-sm text-gray-500">
          Times are SAST. Zero Attendance Alert and TSK Attendance each check Tue-Fri and Saturday, at the times below. TSK Attendance sends at the same time for every group.
        </p>
        <EmailScheduleForm schedules={schedules.map((s) => ({ slot: s.slot as "ZERO_ATTENDANCE_WEEKDAY" | "ZERO_ATTENDANCE_SATURDAY" | "TSK_ATTENDANCE_WEEKDAY" | "TSK_ATTENDANCE_SATURDAY", hour: s.hour, minute: s.minute }))} />
      </div>

      {RECIPIENT_CATEGORIES.map(({ category, title, description }) => (
        <div key={category} className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mb-4 text-sm text-gray-500">{description}</p>
          <EmailRecipientsForm
            category={category}
            recipients={recipients.filter((r) => r.category === category).map((r) => ({ id: r.id, email: r.email }))}
          />
        </div>
      ))}
    </div>
  );
}
