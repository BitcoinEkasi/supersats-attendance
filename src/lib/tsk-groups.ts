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
  TURTLES:      ["Turtle L1", "Turtle L2"],
  SEALS:        ["Seal L3", "Seal L4"],
  DOLPHINS:     ["Dolphin L5", "Dolphin L6"],
  SHARKS:       ["Shark L7"],
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

export function groupSortIndex(group: string | null | undefined): number {
  if (!group) return TSK_GROUPS.length;
  const i = TSK_GROUPS.indexOf(group as TskGroupKey);
  return i === -1 ? TSK_GROUPS.length : i;
}
