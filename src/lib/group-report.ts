// Group rewards, spending & savings report (sponsor/donor reporting).
//
// buildGroupReport() is pure: it takes already-resolved rows and does all the maths, so
// the page, PDF and CSV render identical figures and it can be tested in isolation.
// loadGroupReportInput() gathers those rows from TSK Rewards (approved monthly reports,
// roster history) and Bolt (card-tap spending).

import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";

/** Reporting starts here: earlier months were reconciled from an incomplete export. */
export const REPORT_START_MONTH = "2026-08";

export type ReportEntryRow = { participantId: string; rewardSats: number; paid: boolean; activeAtMonthEnd: boolean };
export type GroupMonthReport = {
  month: string;
  group: TskGroupKey;
  status: string;          // PENDING | APPROVED
  payoutStatus: string;    // unpaid | invoiced | paid
  entries: ReportEntryRow[];
};
export type SpendRow = {
  month: string;
  sats: number;
  /** Group the spender was in that month (roster history); null if not a participant / no group */
  group: TskGroupKey | null;
  participantId: string | null;
  /** How the spender is identified in data-quality notes (TSK ID / card) */
  label: string;
};
export type DataQualityItem = { kind: string; title: string; items: string[] };
export type GroupReportInput = {
  months: string[];
  reports: GroupMonthReport[];
  spending: SpendRow[];
  extraDataQuality?: DataQualityItem[];
};

export type ReportRow = {
  key: TskGroupKey | "ALL";
  label: string;
  paid: number;
  participants: number;
  rewards: number;
  spent: number;
  saved: number;
  /** Whole percent, or null when there were no rewards */
  saveRate: number | null;
};
export type GroupReport = {
  months: string[];
  totals: ReportRow[];
  monthly: { month: string; rows: ReportRow[] }[];
  dataQuality: DataQualityItem[];
};

export function saveRate(saved: number, rewards: number): number | null {
  return rewards > 0 ? Math.round((saved / rewards) * 100) : null;
}

function row(key: ReportRow["key"], paid: number, participants: number, rewards: number, spent: number): ReportRow {
  const saved = rewards - spent;
  return {
    key, label: key === "ALL" ? "All groups" : TSK_GROUP_LABELS[key],
    paid, participants, rewards, spent, saved, saveRate: saveRate(saved, rewards),
  };
}

export function buildGroupReport(input: GroupReportInput): GroupReport {
  const { months } = input;
  const reportOf = (m: string, g: TskGroupKey) => input.reports.find((r) => r.month === m && r.group === g);
  const dataQuality: DataQualityItem[] = [];

  // Per month × group
  type Cell = { paid: Set<string>; participants: number; rewards: number; spent: number };
  const cells = new Map<string, Cell>();
  const cell = (m: string, g: TskGroupKey) => {
    const k = `${m}|${g}`;
    if (!cells.has(k)) cells.set(k, { paid: new Set(), participants: 0, rewards: 0, spent: 0 });
    return cells.get(k)!;
  };

  const notApproved: string[] = [];
  for (const m of months) {
    for (const g of TSK_GROUPS) {
      const c = cell(m, g);
      const r = reportOf(m, g);
      if (!r) continue;
      c.participants = r.entries.filter((e) => e.activeAtMonthEnd).length;
      if (r.status !== "APPROVED" || r.payoutStatus !== "paid") notApproved.push(`${m} ${TSK_GROUP_LABELS[g]} (${r.status === "APPROVED" ? `payout ${r.payoutStatus}` : "not approved"})`);
      for (const e of r.entries) {
        // Same entries the dashboard sums for the report's Total Rewards, so they reconcile by construction
        if (e.paid && e.rewardSats > 0) {
          c.rewards += e.rewardSats;
          c.paid.add(e.participantId);
        }
      }
    }
  }

  const unattributed = new Map<string, number>();
  for (const s of input.spending) {
    if (!months.includes(s.month)) continue;
    if (s.group) cell(s.month, s.group).spent += s.sats;
    else unattributed.set(`${s.month} ${s.label}`, (unattributed.get(`${s.month} ${s.label}`) ?? 0) + s.sats);
  }

  const monthly = months.map((m) => {
    const rows = TSK_GROUPS.map((g) => {
      const c = cell(m, g);
      return row(g, c.paid.size, c.participants, c.rewards, c.spent);
    });
    const paidAll = new Set(TSK_GROUPS.flatMap((g) => [...cell(m, g).paid]));
    rows.push(row("ALL", paidAll.size, rows.reduce((s, r) => s + r.participants, 0),
      rows.reduce((s, r) => s + r.rewards, 0), rows.reduce((s, r) => s + r.spent, 0)));
    return { month: m, rows };
  });

  // Period totals: sums for sats; distinct paid surfers; largest monthly participant count
  const totals = TSK_GROUPS.map((g) => {
    const cs = months.map((m) => cell(m, g));
    const paid = new Set(cs.flatMap((c) => [...c.paid]));
    return row(g, paid.size, Math.max(0, ...cs.map((c) => c.participants)),
      cs.reduce((s, c) => s + c.rewards, 0), cs.reduce((s, c) => s + c.spent, 0));
  });
  const allPaid = new Set(months.flatMap((m) => TSK_GROUPS.flatMap((g) => [...cell(m, g).paid])));
  totals.push(row("ALL", allPaid.size, Math.max(0, ...monthly.map((mo) => mo.rows[mo.rows.length - 1].participants)),
    totals.reduce((s, r) => s + r.rewards, 0), totals.reduce((s, r) => s + r.spent, 0)));

  if (notApproved.length) dataQuality.push({ kind: "not-paid", title: "Reports not yet paid out (their rewards are not counted)", items: notApproved });
  if (unattributed.size) {
    dataQuality.push({
      kind: "no-group",
      title: "Card spending with no surfer group (not counted)",
      items: [...unattributed].map(([k, sats]) => `${k}: ⚡${sats.toLocaleString("en-US")}`),
    });
  }
  dataQuality.push(...(input.extraDataQuality ?? []));

  return { months, totals, monthly, dataQuality };
}

// ── Months & formatting ──────────────────────────────────────────────────────

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

export const monShort = (month: string) => MON[Number(month.slice(5, 7)) - 1];
export const monthLabel = (month: string) => `${monShort(month)} ${month.slice(0, 4)}`;

/** "Aug–Oct 2026", or "Dec 2026–Jan 2027" across a year end, or "Aug 2026" for one month. */
export function periodLabel(from: string, to: string): string {
  if (from === to) return monthLabel(from);
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${monShort(from)}–${monShort(to)} ${to.slice(0, 4)}`
    : `${monthLabel(from)}–${monthLabel(to)}`;
}

/** File-name form: "Aug-Oct-2026" or "Dec-2026-Jan-2027". */
export function periodSlug(from: string, to: string): string {
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${monShort(from)}-${monShort(to)}-${to.slice(0, 4)}`
    : `${monShort(from)}-${from.slice(0, 4)}-${monShort(to)}-${to.slice(0, 4)}`;
}

/** Clamp a requested period to [REPORT_START_MONTH, latestMonth]; defaults to the last 4 months. */
export function resolvePeriod(
  fromParam: string | undefined,
  toParam: string | undefined,
  latestMonth: string,
): { from: string; to: string } {
  const clamp = (m: string) => (m < REPORT_START_MONTH ? REPORT_START_MONTH : m > latestMonth ? latestMonth : m);
  let to = toParam && MONTH_RE.test(toParam) ? clamp(toParam) : latestMonth;
  if (to < REPORT_START_MONTH) to = REPORT_START_MONTH;
  let from = fromParam && MONTH_RE.test(fromParam) ? clamp(fromParam) : clamp(addMonths(to, -3));
  if (from > to) from = to;
  return { from, to };
}

/** ⚡147,864 / −⚡12,868 */
export function fmtBolt(n: number): string {
  return `${n < 0 ? "−" : ""}⚡${Math.abs(n).toLocaleString("en-US")}`;
}
export function fmtRate(r: number | null): string {
  return r === null ? "–" : `${r < 0 ? "−" : ""}${Math.abs(r)}%`;
}
export const fmtSurfers = (r: ReportRow) => `${r.paid}/${r.participants}`;

export const REPORT_FOOTNOTES = [
  "⚡ = sats (1 sat = 0.00000001 bitcoin).",
  "Save rate = saved ÷ rewards, where saved = rewards − spent. It can be negative when surfers spend savings from earlier months.",
  "Rewards are counted in the month they were earned for (paid early the following month). Spent = card payments made during that calendar month (SAST), in the group the surfer was in that month.",
  "Surfers = surfers paid a reward / active participants at month end.",
  "Not counted: Surf Series and competition prizes, manual credits, admin withdrawals, card fees, Lightning address top-ups, test cards, and movements flagged as excluded.",
];
