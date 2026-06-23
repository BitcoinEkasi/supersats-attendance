import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildTiers } from "@/lib/rewards";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getSASTNow, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";
import ExportButton from "./export-button";
import ApproveButton from "../approve-button";
import ReportTable from "./report-table";
import PayoutInvoicePanel from "../payout-invoice-panel";
import CreatePayoutButton from "../create-payout-button";
import { TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import { getBoltUser, getZarPerSat, satsToZar } from "@/lib/bolt";
import { upsertMonthlyReport } from "@/lib/upsert-report";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month: reportId } = await params;

  // Auto-refresh: recalculate from latest attendance data on every open (PENDING only)
  const reportMeta = await prisma.monthlyReport.findUnique({
    where: { id: reportId },
    select: { month: true, group: true, status: true, generatedBy: true },
  });
  if (!reportMeta) notFound();
  if (reportMeta.status !== "APPROVED") {
    await upsertMonthlyReport(
      reportMeta.month,
      reportMeta.generatedBy,
      (reportMeta.group as TskGroupKey | null) ?? null,
    );
  }

  const monthStart = getStartOfSASTMonth(reportMeta.month);
  const monthEnd   = getEndOfSASTMonth(reportMeta.month);

  const [report, session, rewardSettings, liveZarPerSat, monthEvents] = await Promise.all([
    prisma.monthlyReport.findUnique({
      where: { id: reportId },
      include: {
        entries: {
          include: {
            participant: {
              select: {
                tskId: true, surname: true, fullNames: true, knownAs: true,
                dateOfBirth: true, gender: true, isAssistantCoach: true, assistantCoachSince: true,
                boltUserId: true, paymentMethod: true,
                registrationDate: true, retiredAt: true,
              },
            },
          },
          orderBy: { percentage: "desc" },
        },
      },
    }),
    auth(),
    getActiveRewardSettings(),
    getZarPerSat(),
    prisma.event.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        ...(reportMeta.group ? { group: reportMeta.group } : {}),
      },
      select: { category: true },
    }),
  ]);
  const REWARD_TIERS = buildTiers(rewardSettings.minSats, rewardSettings.maxSats);

  if (!report) notFound();

  // Use locked-in rate for approved reports, live rate for pending
  const zarPerSat = report.status === "APPROVED" ? (report.zarPerSat ?? liveZarPerSat) : liveZarPerSat;

  const role = session?.user?.role;

  const { year, month } = getSASTNow();
  const currentYM = `${year}-${String(month).padStart(2, "0")}`;
  const monthComplete = report.month < currentYM;

  const totalSats = report.entries.reduce((sum, e) => sum + e.rewardSats, 0);
  const totalParticipants = report.entries.length;
  const totalSessions = monthEvents.length;
  const avgPercentage =
    totalParticipants > 0
      ? report.entries.reduce((sum, e) => sum + Number(e.percentage), 0) / totalParticipants
      : 0;
  const qualifyingParticipants = report.entries.filter((e) => e.rewardSats > 0).length;

  const categoryLabels: Record<string, string> = {
    SURFING: "Surfing", FITNESS: "Fitness", SKATING: "Skating",
    BEACH_CLEAN_UP: "Beach Clean Up", BEACH_ACTIVITIES: "Beach Activities",
    SIMULATED_HEATS: "Simulated Heats", VIDEO_ANALYSIS: "Video Analysis",
    MENTAL_TRAINING: "Mental Training", SCORING_REVIEW: "Scoring Review", OTHER: "Other",
  };
  const activityBreakdown = monthEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});

  const missingCards = report.entries
    .filter((e) => e.rewardSats > 0 && e.participant.paymentMethod === "BOLT_CARD" && !e.participant.boltUserId)
    .map((e) => ({ tskId: e.participant.tskId, name: `${e.participant.knownAs ?? e.participant.fullNames} ${e.participant.surname}` }));

  const boltCardIds = await Promise.all(
    report.entries
      .filter((e) => e.participant.boltUserId)
      .map((e) =>
        getBoltUser(e.participant.boltUserId!).then((u) => ({ participantId: e.participantId, cardId: u?.card?.card_id ?? null }))
      )
  );
  const cardIdMap: Record<string, string | null> = Object.fromEntries(boltCardIds.map((b) => [b.participantId, b.cardId]));

  // Movement data for the Total Participants breakdown
  const participantIds = report.entries.map((e) => e.participantId);

  const recruited = report.entries
    .filter((e) => {
      const rd = e.participant.registrationDate;
      return rd >= monthStart && rd <= monthEnd;
    })
    .map((e) => e.participant);

  const retired = report.entries
    .filter((e) => {
      const ra = e.participant.retiredAt;
      return ra !== null && ra >= monthStart && ra <= monthEnd;
    })
    .map((e) => e.participant);

  const levelChangesThisMonth = participantIds.length > 0
    ? await prisma.tskLevelHistory.findMany({
        where: { participantId: { in: participantIds }, changedAt: { gte: monthStart, lte: monthEnd } },
        include: { participant: { select: { id: true, surname: true, fullNames: true } } },
        orderBy: { changedAt: "asc" },
      })
    : [];

  const [nextYear, nextMonthNum] = (() => {
    const [y, m] = reportMeta.month.split("-").map(Number);
    return m === 12 ? [y + 1, 1] : [y, m + 1];
  })();
  const nextMonthStart = getStartOfSASTMonth(`${nextYear}-${String(nextMonthNum).padStart(2, "0")}`);
  const pendingChanges = participantIds.length > 0
    ? await prisma.pendingParticipantChange.findMany({
        where: {
          participantId: { in: participantIds },
          field: "tskStatus",
          appliedAt: null,
          effectiveFrom: { gte: nextMonthStart },
        },
        include: { participant: { select: { id: true, surname: true, fullNames: true } } },
      })
    : [];

  const recruitedParticipantIds = new Set(
    report.entries
      .filter((e) => {
        const rd = e.participant.registrationDate;
        return rd >= monthStart && rd <= monthEnd;
      })
      .map((e) => e.participantId)
  );

  const joined = levelChangesThisMonth.filter((c) => !recruitedParticipantIds.has(c.participantId));

  const tierCounts = REWARD_TIERS.map((tier) => ({
    ...tier,
    count: report.entries.filter((e) => {
      const matched = REWARD_TIERS.find((t) => Number(e.percentage) >= t.min);
      return matched === tier;
    }).length,
  }));

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Report: {(() => { const [y, m] = report.month.split("-"); return `${new Date(+y, +m - 1).toLocaleString("en-GB", { month: "short" })} '${y.slice(2)}`; })()}
            {report.group && (
              <span className="ml-2 inline-flex rounded-full bg-orange-100 px-3 py-0.5 text-base font-medium text-orange-700">
                {TSK_GROUP_LABELS[report.group] ?? report.group}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Generated by {report.generatedBy} on {fmtDate(report.generatedAt)}
          </p>
          {report.status === "APPROVED" && report.approvedBy && (
            <p className="mt-1 text-sm text-green-600">
              Approved by {report.approvedBy} on{" "}
              {report.approvedAt ? fmtDate(report.approvedAt) : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {report.status === "APPROVED" ? (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Approved
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
              Pending Approval
            </span>
          )}
          <ExportButton reportId={report.id} month={report.month} />
{role === "ADMINISTRATOR" && report.status === "PENDING" && (
            <ApproveButton reportId={report.id} disabled={!monthComplete} missingCards={missingCards} />
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Participants</p>
          <p className="mt-1 text-2xl font-bold">{totalParticipants}</p>
          <div className="mt-2 space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Movement</p>
            <p className="text-xs text-gray-500">
              Recruited {recruited.length}
              {recruited.length > 0 && (
                <span className="text-gray-400"> ({recruited.map((p) => `${p.fullNames} ${p.surname}`).join(", ")})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              Retired {retired.length}
              {retired.length > 0 && (
                <span className="text-gray-400"> ({retired.map((p) => `${p.fullNames} ${p.surname}`).join(", ")})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              Transition {pendingChanges.length}
              {pendingChanges.length > 0 && (
                <span className="text-gray-400"> ({pendingChanges.map((c) => `${c.participant.fullNames} ${c.participant.surname} → ${c.newValue}`).join(", ")})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              Joined {joined.length}
              {joined.length > 0 && (
                <span className="text-gray-400"> ({joined.map((c) => `${c.participant.fullNames} ${c.participant.surname} → ${c.level}`).join(", ")})</span>
              )}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Sessions</p>
          <p className="mt-1 text-2xl font-bold">{totalSessions}</p>
          {Object.entries(activityBreakdown).length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Activity</p>
              <ul className="space-y-0.5">
                {Object.entries(activityBreakdown).map(([cat, count]) => (
                  <li key={cat} className="flex items-center justify-between text-xs text-gray-500">
                    <span>{categoryLabels[cat] ?? cat}</span>
                    <span className="ml-2 font-medium text-gray-700">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Qualifying</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{qualifyingParticipants}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Average Attendance</p>
          <p className="mt-1 text-2xl font-bold">{Math.floor(avgPercentage / 5) * 5}%</p>
          <span className="text-xs text-gray-400">(rounded down to nearest 5%)</span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Rewards</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            🗲 {totalSats.toLocaleString()} sats
          </p>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Reward Tier Breakdown</h3>
        <div className="mt-4 grid grid-cols-4 gap-3 lg:grid-cols-8">
          {[...tierCounts].reverse().map((tier) => (
            <div key={tier.label} className="text-center">
              <p className={`text-lg font-bold ${tier.color}`}>{tier.count}</p>
              <p className="text-xs text-gray-500">{tier.label}</p>
              <p className="text-xs font-medium text-gray-700">
                {tier.sats > 0 ? `🗲 ${tier.sats} sats` : "No reward"}
              </p>
              {tier.sats > 0 && zarPerSat && (
                <p className={`text-xs ${report.status === "APPROVED" && report.zarPerSat ? "text-green-600" : "text-gray-400"}`}>({satsToZar(tier.sats, zarPerSat)})</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Direct-paid from reserves (no invoice) */}
      {report.status === "APPROVED" && report.payoutStatus === "paid" && !report.paymentRequest && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            ✓ Paid directly from bolt reserves — {report.totalPayoutSats?.toLocaleString()} sats distributed to {qualifyingParticipants} participant{qualifyingParticipants !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Payout invoice panel (shown after approval when invoice exists) */}
      {report.status === "APPROVED" && report.payoutStatus !== "unpaid" && report.paymentRequest && (
        <PayoutInvoicePanel
          reportId={report.id}
          paymentRequest={report.paymentRequest}
          qrBase64=""
          totalSats={report.totalPayoutSats}
          initialStatus={report.payoutStatus}
        />
      )}

      {/* Create payout button (shown when approved but no payout yet) */}
      {report.status === "APPROVED" && report.payoutStatus === "unpaid" && role === "ADMINISTRATOR" && (
        <CreatePayoutButton reportId={report.id} />
      )}

      <ReportTable
        reportMonth={report.month}
        rewardTiers={REWARD_TIERS}
        zarPerSat={zarPerSat ?? null}
        zarLocked={report.status === "APPROVED" && !!report.zarPerSat}
        entries={report.entries.map(e => ({
          ...e,
          percentage: e.percentage.toString(),
          cardId: cardIdMap[e.participantId] ?? null,
          participant: {
            tskId: e.participant.tskId,
            surname: e.participant.surname,
            fullNames: e.participant.fullNames,
            knownAs: e.participant.knownAs,
            dateOfBirth: e.participant.dateOfBirth,
            gender: e.participant.gender,
            isAssistantCoach: e.participant.isAssistantCoach,
            assistantCoachSince: e.participant.assistantCoachSince,
          },
        }))}
      />
    </div>
  );
}
