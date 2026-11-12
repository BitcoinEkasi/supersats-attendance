import { prisma } from "@/lib/db";
import { buildCalculateRewardSats, applyPenalty } from "@/lib/rewards";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getBoltReserve, getZarPerSat, satsToZar } from "@/lib/bolt";
import { getSASTDateString, getDaysInSASTMonth, isProgrammeDay, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";
import { acMultiplierForMonth } from "@/lib/tsk-levels";
import { upsertMonthlyReport } from "@/lib/upsert-report";

const DEFAULT_RECIPIENT = "thinus@bitcoinekasi.com";

/** The single settings row, created with defaults (and the default recipient) on first use. */
export async function getTopupSettings() {
  const existing = await prisma.topupForecastSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  const created = await prisma.topupForecastSettings.upsert({
    where: { id: "default" },
    create: { id: "default", updatedBy: "system" },
    update: {},
  });
  const hasRecipient = await prisma.emailRecipient.count({ where: { category: "TOPUP_REQUEST" } });
  if (hasRecipient === 0) {
    await prisma.emailRecipient
      .create({ data: { category: "TOPUP_REQUEST", email: DEFAULT_RECIPIENT, createdBy: "system" } })
      .catch(() => undefined);
  }
  return created;
}

const toDateStr = (d: Date) => d.toISOString().slice(0, 10); // events/excuses are stored at UTC noon

/**
 * Sessions not yet held this month, per group: programme days (Tue–Sat) from today on that
 * aren't excused for the group and don't already have a captured session (an event with
 * attendance records) for it. Also returns, per group, how many of the month's events are
 * still un-held (pre-created ahead, or today's not yet captured) — those are counted in a
 * report's totalEvents but can't have been attended yet.
 */
export async function getRemainingSessions(month: string) {
  const today = getSASTDateString();
  const [events, excused] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: getStartOfSASTMonth(month), lte: getEndOfSASTMonth(month) } },
      select: { date: true, group: true, _count: { select: { attendanceRecords: true } } },
    }),
    prisma.excusedSession.findMany({
      where: { date: { gte: getStartOfSASTMonth(month), lte: getEndOfSASTMonth(month) } },
      select: { date: true, group: true },
    }),
  ]);

  const futureDays = getDaysInSASTMonth(month).filter((d) => d >= today && isProgrammeDay(d));
  const remaining = {} as Record<TskGroupKey, number>;
  const unheldEvents = {} as Record<TskGroupKey, number>;
  for (const g of TSK_GROUPS) {
    const forGroup = events.filter((e) => e.group === g || e.group === null);
    const heldDays = new Set(forGroup.filter((e) => e._count.attendanceRecords > 0).map((e) => toDateStr(e.date)));
    const excusedDays = new Set(excused.filter((e) => e.group === g).map((e) => toDateStr(e.date)));
    remaining[g] = futureDays.filter((d) => !heldDays.has(d) && !excusedDays.has(d)).length;
    unheldEvents[g] = forGroup.filter((e) => toDateStr(e.date) >= today && e._count.attendanceRecords === 0).length;
  }
  const maxRemaining = Math.max(0, ...TSK_GROUPS.map((g) => remaining[g]));
  return { remaining, unheldEvents, maxRemaining };
}

export type GroupForecast = {
  group: TskGroupKey;
  label: string;
  participants: number;
  remainingSessions: number;
  currentlyQualifying: number; // at 70%+ on attendance so far
  canReach100: number;         // would hit 100% by attending every remaining session
  currentSats: number;         // what the report would pay if the month ended today
  forecastSats: number;        // best case: everyone attends every remaining session
  estimated: boolean;          // no report yet — every active participant counted at max reward
};

export type TopupForecast = {
  month: string;
  generatedAt: string;
  maxRemaining: number;
  groups: GroupForecast[];
  forecastSats: number;
  contingencyPercent: number;
  withContingencySats: number;
  reserveSats: number | null; // null if Bolt couldn't be reached
  topupSats: number;
  zarPerSat: number | null;
};

/** Best-case payout for `month`, plus contingency, against the current Bolt reserve. */
export async function computeTopupForecast(month: string, contingencyPercent: number): Promise<TopupForecast> {
  const { minSats, maxSats } = await getActiveRewardSettings();
  const calc = buildCalculateRewardSats(minSats, maxSats);
  const { remaining, unheldEvents, maxRemaining } = await getRemainingSessions(month);

  // Bring every not-yet-approved group report up to date with the latest attendance first
  // (creates it if the group has sessions but no report yet; approved reports are untouched)
  const existing = await prisma.monthlyReport.findMany({ where: { month }, select: { group: true, status: true, generatedBy: true } });
  await Promise.all(
    TSK_GROUPS.filter((g) => existing.find((r) => r.group === g)?.status !== "APPROVED").map((g) =>
      upsertMonthlyReport(month, existing.find((r) => r.group === g)?.generatedBy ?? "system", g)
    )
  );

  const reports = await prisma.monthlyReport.findMany({
    where: { month, group: { not: null } },
    include: {
      entries: {
        include: { participant: { select: { assistantCoachPeriods: { select: { startedAt: true, endedAt: true } } } } },
      },
    },
  });

  const groups: GroupForecast[] = [];
  for (const g of TSK_GROUPS) {
    const R = remaining[g];
    const report = reports.find((r) => r.group === g);

    // Already approved (paid or being paid) — that money is accounted for elsewhere
    if (report && report.status !== "PENDING") continue;

    if (!report) {
      // No session captured yet this month: assume every active participant in the group earns the max
      const active = await prisma.participant.findMany({ where: { status: "ACTIVE" }, select: { tskStatus: true } });
      const count = active.filter((p) => getGroupForStatus(p.tskStatus) === g).length;
      groups.push({
        group: g, label: TSK_GROUP_LABELS[g], participants: count, remainingSessions: R,
        currentlyQualifying: 0, canReach100: count, currentSats: 0, forecastSats: count * maxSats, estimated: count > 0,
      });
      continue;
    }

    let currentlyQualifying = 0, canReach100 = 0, currentSats = 0, forecastSats = 0;
    for (const e of report.entries) {
      // Held sessions = totalEvents minus this month's not-yet-held events; best case attends every remaining one
      const held = Math.max(e.attended, e.totalEvents - unheldEvents[g]);
      const denom = held + R;
      const projectedPct = denom > 0 ? ((e.attended + R) / denom) * 100 : 0;
      const ac = acMultiplierForMonth(e.participant.assistantCoachPeriods, month);
      const base = calc(projectedPct);
      const gross = ac !== null ? Math.round(base * ac) : base;
      forecastSats += applyPenalty(gross, report.penaltyPercent);
      currentSats += e.rewardSats;
      if (e.percentage >= 70) currentlyQualifying++;
      if (projectedPct >= 100) canReach100++;
    }
    groups.push({
      group: g, label: TSK_GROUP_LABELS[g], participants: report.entries.length, remainingSessions: R,
      currentlyQualifying, canReach100, currentSats, forecastSats, estimated: false,
    });
  }

  const forecastSats = groups.reduce((s, g) => s + g.forecastSats, 0);
  const withContingencySats = Math.ceil(forecastSats * (1 + contingencyPercent / 100));
  const [reserveSats, zarPerSat] = await Promise.all([
    getBoltReserve().then((r) => r.reserve_sats).catch(() => null),
    getZarPerSat().catch(() => null),
  ]);
  const topupSats = Math.max(0, withContingencySats - (reserveSats ?? 0));

  return {
    month, generatedAt: new Date().toISOString(), maxRemaining, groups,
    forecastSats, contingencyPercent, withContingencySats, reserveSats, topupSats, zarPerSat,
  };
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function buildTopupEmail(f: TopupForecast): { subject: string; html: string } {
  const sats = (n: number) => `${n.toLocaleString("en-ZA")} sats`;
  const zar = (n: number) => (f.zarPerSat ? ` (${satsToZar(n, f.zarPerSat)})` : "");
  const label = monthLabel(f.month);
  const needed = f.topupSats > 0;
  const subject = needed
    ? `TSK top-up request — ${label}: ${sats(f.topupSats)} needed`
    : `TSK rewards forecast — ${label}: no top-up needed`;

  const td = 'style="padding:4px 10px;border-bottom:1px solid #eee"';
  const tdr = 'style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right"';
  const rows = f.groups
    .map((g) => `<tr><td style="padding:4px 10px;border-bottom:1px solid #eee;white-space:nowrap">${g.label}${g.estimated ? " *" : ""}</td><td ${tdr}>${g.participants}</td><td ${tdr}>${g.remainingSessions}</td><td ${tdr}>${g.currentlyQualifying}</td><td ${tdr}>${g.canReach100}</td><td ${tdr}>${g.currentSats.toLocaleString("en-ZA")}</td><td ${tdr}>${g.forecastSats.toLocaleString("en-ZA")}</td></tr>`)
    .join("");

  const headline = needed
    ? `<h2 style="color:#c2410c">⚡ Please top up the rewards reserve with ${sats(f.topupSats)}${zar(f.topupSats)}</h2>`
    : `<h2 style="color:#15803d">✓ No top-up needed for ${label}</h2>`;

  const html = `${headline}
<p>${f.maxRemaining} session${f.maxRemaining === 1 ? "" : "s"} left this month. Topping up now lets the ${label} reports be paid straight from reserves when they're approved.</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><td ${td}>Forecast at max (everyone attends every remaining session)</td><td ${tdr}>${sats(f.forecastSats)}${zar(f.forecastSats)}</td></tr>
<tr><td ${td}>Plus ${f.contingencyPercent}% contingency</td><td ${tdr}>${sats(f.withContingencySats)}${zar(f.withContingencySats)}</td></tr>
<tr><td ${td}>Current reserve</td><td ${tdr}>${f.reserveSats === null ? "unavailable (Bolt unreachable — treated as 0)" : sats(f.reserveSats) + zar(f.reserveSats)}</td></tr>
<tr><td ${td}><strong>Top-up needed</strong></td><td ${tdr}><strong>${sats(f.topupSats)}${zar(f.topupSats)}</strong></td></tr>
</table>
<h3>By group</h3>
<table style="border-collapse:collapse;font-size:13px">
<tr><th ${td}>Group</th><th ${tdr}>Participants</th><th ${tdr}>Sessions left</th><th ${tdr}>At 70%+ now</th><th ${tdr}>Can reach 100%</th><th ${tdr}>If paid today</th><th ${tdr}>Forecast at max</th></tr>
${rows}
</table>
<p style="color:#666;font-size:12px">The forecast assumes every participant attends every remaining session, so the real payout will usually be lower.${f.groups.some((g) => g.estimated) ? " * No session captured yet for this group: every active participant is counted at the maximum reward." : ""} Rewards from reports that are already approved are not included. Generated ${new Date(f.generatedAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST.</p>`;

  return { subject, html };
}
