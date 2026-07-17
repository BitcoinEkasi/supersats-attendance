// "excused" reasons remove the day from potential-sessions/gap counts (genuinely uncontrollable).
// "flagged" reasons keep the day counted as a gap — controllable, negative behavior that must still show up in the stats.
export type ExcuseCategory = "excused" | "flagged";

export const EXCUSED_SESSION_REASONS: { label: string; category: ExcuseCategory }[] = [
  { label: "Weather Conditions", category: "excused" },
  { label: "Facility Closed", category: "excused" },
  { label: "Public Holiday", category: "excused" },
  { label: "Coach/Marshal Unavailable", category: "flagged" },
  { label: "Attendance Capturing Skipped", category: "flagged" },
  { label: "Other", category: "excused" },
];

export function getExcuseCategory(reason: string): ExcuseCategory {
  return EXCUSED_SESSION_REASONS.find((r) => r.label === reason)?.category ?? "excused";
}
