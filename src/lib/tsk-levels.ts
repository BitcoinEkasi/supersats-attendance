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
