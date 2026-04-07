const STEPS = [
  { min: 100, sats: 10000 },
  { min: 95,  sats: 8200  },
  { min: 90,  sats: 6700  },
  { min: 85,  sats: 5500  },
  { min: 80,  sats: 4500  },
  { min: 75,  sats: 3700  },
  { min: 70,  sats: 3000  },
];

export function calculateRewardSats(attendancePercent: number): number {
  for (const step of STEPS) {
    if (attendancePercent >= step.min) return step.sats;
  }
  return 0;
}

export const REWARD_TIERS = [
  { min: 100, max: 100, sats: 10000, label: "100%",   color: "text-yellow-600" },
  { min: 95,  max: 99,  sats: 8200,  label: "95–99%", color: "text-green-700"  },
  { min: 90,  max: 94,  sats: 6700,  label: "90–94%", color: "text-green-600"  },
  { min: 85,  max: 89,  sats: 5500,  label: "85–89%", color: "text-blue-700"   },
  { min: 80,  max: 84,  sats: 4500,  label: "80–84%", color: "text-blue-600"   },
  { min: 75,  max: 79,  sats: 3700,  label: "75–79%", color: "text-gray-700"   },
  { min: 70,  max: 74,  sats: 3000,  label: "70–74%", color: "text-gray-600"   },
  { min: 0,   max: 69,  sats: 0,     label: "<70%",   color: "text-red-600"    },
];

export function getRewardTierLabel(sats: number): string {
  return REWARD_TIERS.find(t => t.sats === sats)?.label ?? "Below 70%";
}
