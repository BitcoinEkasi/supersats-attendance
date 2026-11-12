/**
 * Checks the group rewards / spending / savings report maths (src/lib/group-report.ts).
 * Pure function — no database or Bolt needed.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/test-group-report.ts
 */
import assert from "node:assert/strict";
import {
  buildGroupReport, resolvePeriod, periodLabel, periodSlug, fmtBolt, fmtRate, saveRate, monthsBetween,
  type GroupMonthReport,
} from "../src/lib/group-report";

const paidReport = (month: string, group: GroupMonthReport["group"], entries: GroupMonthReport["entries"]): GroupMonthReport =>
  ({ month, group, status: "APPROVED", payoutStatus: "paid", entries });
const e = (participantId: string, rewardSats: number, opts: { paid?: boolean; active?: boolean } = {}) =>
  ({ participantId, rewardSats, paid: opts.paid ?? rewardSats > 0, activeAtMonthEnd: opts.active ?? true });

const report = buildGroupReport({
  months: ["2026-08", "2026-09"],
  reports: [
    // Promotion: P1 is a Dolphin in August and a Shark in September
    paidReport("2026-08", "DOLPHINS", [e("P1", 3000), e("P2", 0), e("P3", 0, { active: false })]),
    paidReport("2026-09", "SHARKS", [e("P1", 4000)]),
    paidReport("2026-08", "TURTLES", [e("P4", 2000), e("P5", 1000)]),
    // Not yet paid out: rewards not counted, participants still counted
    { month: "2026-09", group: "TURTLES", status: "APPROVED", payoutStatus: "invoiced", entries: [e("P4", 1000, { paid: false }), e("P5", 0)] },
  ],
  spending: [
    { month: "2026-08", sats: 5000, group: "DOLPHINS", participantId: "P1", label: "TSK1" }, // negative month
    { month: "2026-09", sats: 500, group: "TURTLES", participantId: "P4", label: "TSK4" },
    { month: "2026-08", sats: 98, group: null, participantId: null, label: "TSK00000 (card E350) — not a participant" },
    { month: "2026-07", sats: 99999, group: "TURTLES", participantId: "P4", label: "TSK4" }, // outside the period
  ],
  extraDataQuality: [{ kind: "excluded", title: "Movements flagged as excluded from reporting", items: ["x"] }],
});

const get = (rows: { key: string }[], key: string) => rows.find((r) => r.key === key) as any;

// ── August
const aug = report.monthly[0].rows;
assert.deepEqual(
  (({ paid, participants, rewards, spent, saved, saveRate }) => ({ paid, participants, rewards, spent, saved, saveRate }))(get(aug, "DOLPHINS")),
  { paid: 1, participants: 2, rewards: 3000, spent: 5000, saved: -2000, saveRate: -67 },
  "Dolphins Aug: retired surfer not counted as a participant; negative save rate",
);
assert.equal(get(aug, "TURTLES").rewards, 3000);
assert.equal(get(aug, "SHARKS").saveRate, null, "no rewards → no save rate");
assert.equal(get(aug, "ALL").paid, 3);
assert.equal(get(aug, "ALL").participants, 4);
assert.equal(get(aug, "ALL").spent, 5000, "spending with no group is not counted");

// ── September: the invoiced Turtles report pays nothing yet
const sep = report.monthly[1].rows;
assert.equal(get(sep, "TURTLES").rewards, 0);
assert.equal(get(sep, "TURTLES").participants, 2);
assert.equal(get(sep, "TURTLES").spent, 500);
assert.equal(get(sep, "SHARKS").rewards, 4000);

// ── Period totals
const t = report.totals;
assert.equal(get(t, "DOLPHINS").rewards, 3000);
assert.equal(get(t, "SHARKS").rewards, 4000, "promoted surfer's rewards split across groups");
assert.equal(get(t, "TURTLES").participants, 2, "largest monthly participant count");
assert.equal(get(t, "ALL").paid, 3, "promoted surfer counted once (P1, P4, P5)");
assert.equal(get(t, "ALL").rewards, 3000 + 3000 + 4000);
assert.equal(get(t, "ALL").spent, 5500, "July spending outside the period ignored");
assert.equal(get(t, "ALL").participants, 4, "largest monthly total");
assert.equal(get(t, "ALL").rewards, t.slice(0, 5).reduce((s: number, r: any) => s + r.rewards, 0), "All groups = plain sum");

// ── Data quality
const kinds = report.dataQuality.map((d) => d.kind);
assert.ok(kinds.includes("not-paid"));
assert.ok(kinds.includes("no-group"));
assert.ok(kinds.includes("excluded"));
assert.match(report.dataQuality.find((d) => d.kind === "no-group")!.items[0], /E350.*⚡98/);

// ── Period handling and formatting
assert.deepEqual(resolvePeriod(undefined, undefined, "2026-10"), { from: "2026-08", to: "2026-10" }, "default clamps to Aug 2026");
assert.deepEqual(resolvePeriod(undefined, undefined, "2027-03"), { from: "2026-12", to: "2027-03" }, "default = last 4 months");
assert.deepEqual(resolvePeriod("2026-06", "2026-09", "2026-10"), { from: "2026-08", to: "2026-09" }, "June clamped to August");
assert.deepEqual(resolvePeriod("2026-09", "2026-12", "2026-10"), { from: "2026-09", to: "2026-10" }, "future clamped");
assert.deepEqual(resolvePeriod("2026-10", "2026-08", "2026-10"), { from: "2026-08", to: "2026-08" }, "from after to");
assert.deepEqual(resolvePeriod("junk", "2026-1", "2026-10"), { from: "2026-08", to: "2026-10" });
assert.deepEqual(monthsBetween("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
assert.equal(periodLabel("2026-08", "2026-10"), "Aug–Oct 2026");
assert.equal(periodLabel("2026-12", "2027-01"), "Dec 2026–Jan 2027");
assert.equal(periodSlug("2026-08", "2026-10"), "Aug-Oct-2026");
assert.equal(fmtBolt(147864), "⚡147,864");
assert.equal(fmtBolt(-12868), "−⚡12,868");
assert.equal(fmtRate(-34), "−34%");
assert.equal(fmtRate(null), "–");
assert.equal(saveRate(97588, 147864), 66);

console.log("test-group-report: all checks passed");
