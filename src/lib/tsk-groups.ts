import type { TskGroup } from "@prisma/client";

export { TskGroup };

export const TSK_GROUP_LABELS: Record<string, string> = {
  TURTLES:     "Turtles",
  SEALS:       "Seals",
  DOLPHINS:    "Dolphins",
  SHARKS:      "Sharks",
  FREE_SURFERS: "Free Surfers",
};

export const TSK_GROUP_LEVELS: Record<string, string[]> = {
  TURTLES:     ["Turtle Rookie", "Turtle Novice"],
  SEALS:       ["Seal Intermediate", "Seal Proficient"],
  DOLPHINS:    ["Dolphin Advanced", "Dolphin Refined"],
  SHARKS:      ["Shark Elite"],
  FREE_SURFERS: ["Free Surfer"],
};

export const TSK_GROUPS = ["TURTLES", "SEALS", "DOLPHINS", "SHARKS", "FREE_SURFERS"] as const;
export type TskGroupKey = (typeof TSK_GROUPS)[number];

export function getGroupForStatus(tskStatus: string | null): TskGroupKey | null {
  if (!tskStatus) return null;
  for (const [group, statuses] of Object.entries(TSK_GROUP_LEVELS)) {
    if (statuses.includes(tskStatus)) return group as TskGroupKey;
  }
  return null;
}

export function participantWhereForGroup(group: TskGroupKey) {
  return { tskStatus: { in: TSK_GROUP_LEVELS[group] } };
}

export function isValidGroup(value: unknown): value is TskGroupKey {
  return TSK_GROUPS.includes(value as TskGroupKey);
}
