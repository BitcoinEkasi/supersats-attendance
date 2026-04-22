import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const minSats = parseInt(body.minSats);
  const maxSats = parseInt(body.maxSats);

  if (isNaN(minSats) || isNaN(maxSats) || minSats < 1 || maxSats < 1) {
    return Response.json({ error: "min and max sats must be positive integers" }, { status: 400 });
  }
  if (minSats >= maxSats) {
    return Response.json({ error: "Min sats must be less than max sats" }, { status: 400 });
  }

  const setting = await prisma.rewardSettings.create({
    data: {
      id: randomUUID(),
      minSats,
      maxSats,
      effectiveFrom: new Date(),
      createdBy: user.name ?? user.id,
    },
  });

  return Response.json({ success: true, setting });
}

export async function GET() {
  const settings = await prisma.rewardSettings.findMany({
    orderBy: { effectiveFrom: "desc" },
    take: 10,
  });
  return Response.json(settings);
}
