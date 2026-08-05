export const TSK_LEVELS = [
  { value: "Turtle L1",   tagline: "Learning to trust the water" },
  { value: "Turtle L2",   tagline: "From assisted movement to independent control" },
  { value: "Seal L3",     tagline: "First connection with unbroken waves" },
  { value: "Seal L4",     tagline: "Learning to travel across the wave face" },
  { value: "Dolphin L5",  tagline: "Creating flow through movement and speed" },
  { value: "Dolphin L6",  tagline: "Refining flow through control and timing" },
  { value: "Shark L7",    tagline: "Cultivating a competitive mindset and resilience" },
  { value: "Free Surfer", tagline: "Freedom of expression through surfing" },
] as const;

export const TSK_LEVEL_MAP = Object.fromEntries(TSK_LEVELS.map((l) => [l.value, l.tagline]));

export const POD_LEVEL = "Shark L7";
export const FREE_SURFER_LEVEL = "Free Surfer";

export const AC_ELIGIBLE_LEVELS = ["Free Surfer"] as const;

export function isAcEligible(tskStatus: string | null): boolean {
  return AC_ELIGIBLE_LEVELS.includes(tskStatus as (typeof AC_ELIGIBLE_LEVELS)[number]);
}

export function getAcMultiplier(assistantCoachSince: Date | string, reportMonth: string): number {
  const since = assistantCoachSince instanceof Date ? assistantCoachSince : new Date(assistantCoachSince);
  const [reportYear, reportMon] = reportMonth.split("-").map(Number);
  const elapsed = (reportYear - since.getUTCFullYear()) * 12 + (reportMon - (since.getUTCMonth() + 1));
  if (elapsed <= 5)  return 6;
  if (elapsed <= 11) return 9;
  if (elapsed <= 17) return 12;
  if (elapsed <= 23) return 15;
  if (elapsed <= 29) return 18;
  return 21;
}

/** Was there an open AssistantCoachPeriod covering reportMonth? Used instead of the live
 *  isAssistantCoach flag so historical months keep reflecting what was true at the time,
 *  independent of whether the participant has since been revoked/retired. */
export function acMultiplierForMonth(
  periods: { startedAt: Date | string; endedAt: Date | string | null }[],
  reportMonth: string,
): number | null {
  const [y, m] = reportMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m, 1)); // exclusive
  const covering = periods.find((p) => {
    const start = p.startedAt instanceof Date ? p.startedAt : new Date(p.startedAt);
    const end = p.endedAt ? (p.endedAt instanceof Date ? p.endedAt : new Date(p.endedAt)) : null;
    return start < monthEnd && (!end || end >= monthStart);
  });
  return covering ? getAcMultiplier(covering.startedAt, reportMonth) : null;
}
