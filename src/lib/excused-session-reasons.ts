// "excused" reasons remove the day from potential-sessions/gap counts (genuinely uncontrollable).
// "flagged" reasons keep the day counted as a gap — controllable, negative behavior that must still show up in the stats.
export type ExcuseCategory = "excused" | "flagged";

// "group" reasons apply to a single group's flag. "all-groups" reasons apply to the
// cross-group flag on the All Groups view, which replicates the same reason to every group.
export type ExcuseScope = "group" | "all-groups";

export type ExcusedSessionReason = { label: string; category: ExcuseCategory; scopes: ExcuseScope[]; color: string };

export const EXCUSED_SESSION_REASONS: ExcusedSessionReason[] = [
  { label: "Unfavorable weather or ocean conditions", category: "excused", scopes: ["group", "all-groups"], color: "#c026d3" },
  { label: "Programme closed by management decision / Public holiday", category: "excused", scopes: ["all-groups"], color: "#7dd3fc" },
  { label: "Attendance not taken", category: "flagged", scopes: ["group", "all-groups"], color: "#ef4444" },
  { label: "Technical issue", category: "flagged", scopes: ["group", "all-groups"], color: "#f97316" },
];

const FALLBACK_COLOR = "#6b7280"; // neutral gray — any legacy reason string that isn't one of the current labels

export function getExcuseCategory(reason: string): ExcuseCategory {
  return EXCUSED_SESSION_REASONS.find((r) => r.label === reason)?.category ?? "excused";
}

export function getReasonColor(reason: string): string {
  return EXCUSED_SESSION_REASONS.find((r) => r.label === reason)?.color ?? FALLBACK_COLOR;
}

export function getReasonsForScope(scope: ExcuseScope): ExcusedSessionReason[] {
  return EXCUSED_SESSION_REASONS.filter((r) => r.scopes.includes(scope));
}
