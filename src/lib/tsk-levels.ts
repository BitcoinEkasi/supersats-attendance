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

export const AC_ELIGIBLE_LEVELS = ["Dolphin L5", "Dolphin L6", "Free Surfer"] as const;

export function isAcEligible(tskStatus: string | null): boolean {
  return AC_ELIGIBLE_LEVELS.includes(tskStatus as (typeof AC_ELIGIBLE_LEVELS)[number]);
}

export function getAcMultiplier(assistantCoachSince: Date | string, reportMonth: string): number {
  const since = assistantCoachSince instanceof Date ? assistantCoachSince : new Date(assistantCoachSince);
  const [reportYear, reportMon] = reportMonth.split("-").map(Number);
  const elapsed = (reportYear - since.getUTCFullYear()) * 12 + (reportMon - (since.getUTCMonth() + 1));
  if (elapsed <= 0)  return 1;
  if (elapsed <= 5)  return 3;
  if (elapsed <= 11) return 5;
  if (elapsed <= 17) return 7;
  return 9;
}
