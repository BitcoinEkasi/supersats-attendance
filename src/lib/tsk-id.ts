import type { PrismaClient } from "@prisma/client";

// Type for Prisma transaction client (subset of PrismaClient without transaction methods)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function getNextTskId(tx: TransactionClient): Promise<string> {
  const last = await tx.participant.findFirst({
    orderBy: { tskId: "desc" },
    select: { tskId: true },
  });

  const n = last ? parseInt(last.tskId.replace("TSK", "")) + 1 : 1;
  return `TSK${String(n).padStart(5, "0")}`;
}
