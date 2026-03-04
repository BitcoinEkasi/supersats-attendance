export function calculateRewardSats(attendancePercent: number): number {
  if (attendancePercent >= 100) return 7500;
  if (attendancePercent >= 90) return 7000;
  if (attendancePercent >= 80) return 6000;
  if (attendancePercent >= 70) return 5000;
  return 0;
}

export function getRewardTierLabel(sats: number): string {
  switch (sats) {
    case 7500:
      return "100%";
    case 7000:
      return "90-99%";
    case 6000:
      return "80-89%";
    case 5000:
      return "70-79%";
    default:
      return "Below 70%";
  }
}

export const REWARD_TIERS = [
  { min: 100, max: 100, sats: 7500, label: "100%", color: "text-yellow-600" },
  {
    min: 90,
    max: 99,
    sats: 7000,
    label: "90-99%",
    color: "text-green-600",
  },
  { min: 80, max: 89, sats: 6000, label: "80-89%", color: "text-blue-600" },
  { min: 70, max: 79, sats: 5000, label: "70-79%", color: "text-gray-600" },
  { min: 0, max: 69, sats: 0, label: "<70%", color: "text-red-600" },
];
