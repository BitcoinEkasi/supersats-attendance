import { prisma } from "@/lib/db";
import { getGroupSpending, type BoltMovementRef } from "@/lib/bolt";
import { getEndOfSASTMonth, getSASTNow } from "@/lib/sast";
import { groupAsOf, isParticipantActiveOn, type LevelHistoryRow } from "@/lib/roster-history";
import type { TskGroupKey } from "@/lib/tsk-groups";
import { addMonths, monthsBetween, type DataQualityItem, type GroupReportInput } from "@/lib/group-report";

/** The most recent fully completed month (SAST): reports are only meaningful once a month has ended. */
export function latestCompletedMonth(): string {
  const { year, month } = getSASTNow();
  return addMonths(`${year}-${String(month).padStart(2, "0")}`, -1);
}

const sastDate = (unix?: number) =>
  unix ? new Date((unix + 2 * 3600) * 1000).toISOString().slice(0, 16).replace("T", " ") : "";
const who = (m: BoltMovementRef) => `${m.username.toUpperCase()}${m.card_id ? ` (card ${m.card_id})` : ""}`;
const sats = (n?: number) => `⚡${(n ?? 0).toLocaleString("en-US")}`;

/** Gathers report rows from TSK Rewards and card spending from Bolt for `from`..`to`. */
export async function loadGroupReportInput(from: string, to: string): Promise<GroupReportInput> {
  const months = monthsBetween(from, to);

  const [reports, participants, levelHistory, bolt] = await Promise.all([
    prisma.monthlyReport.findMany({
      where: { month: { in: months }, group: { not: null } },
      include: {
        entries: {
          select: {
            participantId: true, rewardSats: true, payoutStatus: true,
            participant: { select: { registrationDate: true, status: true, retiredAt: true } },
          },
        },
      },
    }),
    prisma.participant.findMany({
      where: { boltUserId: { not: null } },
      select: { id: true, tskId: true, boltUserId: true, tskStatus: true },
    }),
    prisma.tskLevelHistory.findMany({ select: { participantId: true, level: true, changedAt: true }, orderBy: { changedAt: "asc" } }),
    getGroupSpending(from, to),
  ]);

  const history = new Map<string, LevelHistoryRow[]>();
  for (const h of levelHistory) {
    const arr = history.get(h.participantId);
    if (arr) arr.push(h); else history.set(h.participantId, [h]);
  }
  const byBoltId = new Map(participants.map((p) => [Number(p.boltUserId), p]));

  const spending = bolt.spending.map((s) => {
    const p = byBoltId.get(s.user_id);
    const group = p ? groupAsOf(history, p.id, getEndOfSASTMonth(s.month), p.tskStatus) : null;
    return {
      month: s.month,
      sats: s.sats,
      group: (group as TskGroupKey | null) ?? null,
      participantId: p?.id ?? null,
      label: p ? `${p.tskId}${s.card_id ? ` (card ${s.card_id})` : ""}` : `${s.username.toUpperCase()}${s.card_id ? ` (card ${s.card_id})` : ""} — not a participant`,
    };
  });

  const dq = bolt.data_quality;
  const extra: DataQualityItem[] = [];
  if (bolt.excluded.length) extra.push({
    kind: "excluded", title: "Movements flagged as excluded from reporting",
    items: bolt.excluded.map((m) => `${sastDate(m.created_at)} ${who(m)} ${sats(m.amount_sats)} ${m.description ?? ""} — ${m.reason ?? ""}${m.excluded_by ? ` (by ${m.excluded_by})` : ""}`),
  });
  if (dq.duplicate_reward_credits.length) extra.push({
    kind: "duplicate-rewards", title: "Monthly reward credited more than once in Bolt (check for a reversal below)",
    items: dq.duplicate_reward_credits.map((m) => `${who(m)} ${m.description}: ${m.count}× (total ${sats(m.total_sats)})`),
  });
  if (dq.corrections.length) extra.push({
    kind: "corrections", title: "Corrections / reversals",
    items: dq.corrections.map((m) => `${sastDate(m.created_at)} ${who(m)} ${sats(m.amount_sats)} ${m.description ?? ""}`),
  });
  if (dq.identical_movements.length) extra.push({
    kind: "identical", title: "Identical movements (same card, amount, note and time)",
    items: dq.identical_movements.map((m) => `${sastDate(m.created_at)} ${who(m)} ${m.type} ${sats(m.amount_sats)} ${m.description ?? ""} ×${m.count}`),
  });
  if (dq.spenders_without_card_id.length) extra.push({
    kind: "no-card-id", title: "Cards with spending but no card ID",
    items: dq.spenders_without_card_id.map(who),
  });

  return {
    months,
    reports: reports.map((r) => {
      const monthEnd = getEndOfSASTMonth(r.month);
      return {
        month: r.month,
        group: r.group as TskGroupKey,
        status: r.status,
        payoutStatus: r.payoutStatus,
        entries: r.entries.map((e) => ({
          participantId: e.participantId,
          rewardSats: e.rewardSats,
          paid: e.payoutStatus === "paid",
          activeAtMonthEnd: isParticipantActiveOn(e.participant, monthEnd),
        })),
      };
    }),
    spending,
    extraDataQuality: extra,
  };
}
