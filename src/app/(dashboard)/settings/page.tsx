import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BackupRestore from "./backup-restore";
import RewardSettingsForm from "./reward-settings-form";
import EmailRecipientsForm from "./email-recipients-form";
import EmailScheduleForm from "./email-schedule-form";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getZarPerSat } from "@/lib/bolt";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const [current, history, zarPerSat, recipients, schedules] = await Promise.all([
    getActiveRewardSettings(),
    prisma.rewardSettings.findMany({ orderBy: { effectiveFrom: "desc" }, take: 10 }),
    getZarPerSat(),
    prisma.emailRecipient.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.emailSchedule.findMany(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Reward Settings</h3>
        <p className="mb-4 text-sm text-gray-500">
          Set the sats reward at 70% attendance (min) and 100% (max). The exponential curve between them is computed automatically. Changes take effect immediately for all new and refreshed reports — approved reports are unaffected.
        </p>
        <RewardSettingsForm
          currentMinSats={current.minSats}
          currentMaxSats={current.maxSats}
          zarPerSat={zarPerSat}
          history={history.map((h) => ({
            id: h.id,
            minSats: h.minSats,
            maxSats: h.maxSats,
            effectiveFrom: h.effectiveFrom.toISOString(),
            createdBy: h.createdBy,
            zarPerSat: h.zarPerSat ?? null,
          }))}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Email Recipients</h3>
        <p className="mb-4 text-sm text-gray-500">
          Addresses that receive Zero Attendance, TSK Pulse, and TSK Attendance emails.
        </p>
        <EmailRecipientsForm recipients={recipients.map((r) => ({ id: r.id, email: r.email }))} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Email Schedule</h3>
        <p className="mb-4 text-sm text-gray-500">
          Times are SAST. Zero Attendance and TSK Pulse each send Tue-Fri and Saturday, at the times below.
        </p>
        <EmailScheduleForm schedules={schedules.map((s) => ({ slot: s.slot, hour: s.hour, minute: s.minute }))} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Backup & Restore</h3>
        <BackupRestore />
      </div>
    </div>
  );
}
