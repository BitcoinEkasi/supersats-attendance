import { prisma } from "@/lib/db";
import { DEFAULT_MIN_SATS, DEFAULT_MAX_SATS } from "@/lib/rewards";

export async function getActiveRewardSettings(): Promise<{ minSats: number; maxSats: number }> {
  const row = await prisma.rewardSettings.findFirst({
    where: { effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
    select: { minSats: true, maxSats: true },
  });
  return row ?? { minSats: DEFAULT_MIN_SATS, maxSats: DEFAULT_MAX_SATS };
}
