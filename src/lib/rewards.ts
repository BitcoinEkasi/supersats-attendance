export const DEFAULT_MIN_SATS = 3000;
export const DEFAULT_MAX_SATS = 10000;

// 7 tiers from 70% to 100% — exponential curve between minSats and maxSats
const TIER_THRESHOLDS = [
  { min: 100, max: 100, label: "100%", color: "text-yellow-600", idx: 6 },
  { min: 95,  max: 99,  label: "95%",  color: "text-green-700",  idx: 5 },
  { min: 90,  max: 94,  label: "90%",  color: "text-green-600",  idx: 4 },
  { min: 85,  max: 89,  label: "85%",  color: "text-blue-700",   idx: 3 },
  { min: 80,  max: 84,  label: "80%",  color: "text-blue-600",   idx: 2 },
  { min: 75,  max: 79,  label: "75%",  color: "text-gray-700",   idx: 1 },
  { min: 70,  max: 74,  label: "70%",  color: "text-gray-600",   idx: 0 },
  { min: 0,   max: 69,  label: "<70%", color: "text-red-600",    idx: -1 },
];

export function buildTiers(minSats: number, maxSats: number) {
  const ratio = Math.pow(maxSats / minSats, 1 / 6);
  return TIER_THRESHOLDS.map((t) => ({
    ...t,
    sats: t.idx < 0 ? 0 : t.idx === 6 ? maxSats : Math.round(minSats * Math.pow(ratio, t.idx)),
  }));
}

export function buildCalculateRewardSats(minSats: number, maxSats: number) {
  const tiers = buildTiers(minSats, maxSats);
  return function (pct: number): number {
    for (const tier of tiers) {
      if (pct >= tier.min) return tier.sats;
    }
    return 0;
  };
}

// Static defaults — used as fallback and for components that don't fetch DB settings
export const REWARD_TIERS = buildTiers(DEFAULT_MIN_SATS, DEFAULT_MAX_SATS);

export function calculateRewardSats(pct: number): number {
  return buildCalculateRewardSats(DEFAULT_MIN_SATS, DEFAULT_MAX_SATS)(pct);
}

export function getRewardTierLabel(sats: number): string {
  return REWARD_TIERS.find((t) => t.sats === sats)?.label ?? "<70%";
}

// Display precision only — the reward bracket itself (buildCalculateRewardSats above)
// always operates on the raw, unrounded percentage and is unaffected by this.
export function fmtPct(pct: number): string {
  return `${Math.floor(pct)}%`;
}

// Weighted by session count (sum of attended / sum of attendable sessions), not a mean
// of each participant's own percentage — a participant with fewer eligible sessions
// (e.g. retired mid-month) shouldn't count as heavily as one with a full month.
export function weightedAvgPercentage(entries: { attended: number; totalEvents: number }[]): number {
  const totalAttended = entries.reduce((sum, e) => sum + e.attended, 0);
  const totalAttendable = entries.reduce((sum, e) => sum + e.totalEvents, 0);
  return totalAttendable > 0 ? (totalAttended / totalAttendable) * 100 : 0;
}
