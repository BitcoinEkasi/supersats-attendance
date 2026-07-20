// "excused" reasons remove the day from potential-sessions/gap counts (genuinely uncontrollable).
// "flagged" reasons keep the day counted as a gap — controllable, negative behavior that must still show up in the stats.
export type ExcuseCategory = "excused" | "flagged";

// "group" reasons apply to a single group's flag. "all-groups" reasons apply to the
// cross-group flag on the All Groups view, which replicates the same reason to every group.
export type ExcuseScope = "group" | "all-groups";

export type ExcusedSessionReason = { label: string; category: ExcuseCategory; scopes: ExcuseScope[] };

export const EXCUSED_SESSION_REASONS: ExcusedSessionReason[] = [
  { label: "Weather Conditions", category: "excused", scopes: ["group", "all-groups"] },
  { label: "Facility Closed", category: "excused", scopes: ["all-groups"] },
  { label: "Public Holiday", category: "excused", scopes: ["all-groups"] },
  { label: "Attendance Skipped", category: "flagged", scopes: ["group", "all-groups"] },
  { label: "Technical Issue", category: "flagged", scopes: ["group", "all-groups"] },
];

export function getExcuseCategory(reason: string): ExcuseCategory {
  return EXCUSED_SESSION_REASONS.find((r) => r.label === reason)?.category ?? "excused";
}

export function getReasonsForScope(scope: ExcuseScope): ExcusedSessionReason[] {
  return EXCUSED_SESSION_REASONS.filter((r) => r.scopes.includes(scope));
}
