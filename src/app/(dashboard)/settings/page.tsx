import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BackupRestore from "./backup-restore";
import RewardSettingsForm from "./reward-settings-form";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getZarPerSat } from "@/lib/bolt";
import TopupForecastForm from "./topup-forecast-form";
import EmailRecipientsForm from "../email-settings/email-recipients-form";
import { getTopupSettings } from "@/lib/topup-forecast";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const topup = await getTopupSettings(); // creates defaults + default recipient on first visit
  const [current, history, zarPerSat, topupRecipients] = await Promise.all([
    getActiveRewardSettings(),
    prisma.rewardSettings.findMany({ orderBy: { effectiveFrom: "desc" }, take: 10 }),
    getZarPerSat(),
    prisma.emailRecipient.findMany({ where: { category: "TOPUP_REQUEST" }, orderBy: { createdAt: "asc" }, select: { id: true, email: true } }),
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
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Top-up Request</h3>
        <p className="mb-4 text-sm text-gray-500">
          Near month end, forecasts the most this month&apos;s rewards could cost (everyone attending every remaining session), adds a contingency, compares it with the current Bolt reserve and emails a top-up request — so reports can be paid straight from reserves when approved.
        </p>
        <TopupForecastForm
          enabled={topup.enabled}
          remainingSessions={topup.remainingSessions}
          contingencyPercent={topup.contingencyPercent}
          topupAddress={topup.topupAddress}
          lastSentMonth={topup.lastSentMonth}
        />
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Email top-up request to:</p>
          <EmailRecipientsForm category="TOPUP_REQUEST" recipients={topupRecipients} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Backup & Restore</h3>
        <BackupRestore />
      </div>
    </div>
  );
}
