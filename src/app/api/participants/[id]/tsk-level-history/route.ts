import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { TSK_LEVELS } from "@/lib/tsk-levels";

const VALID_LEVELS = TSK_LEVELS.map((l) => l.value);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const body = await req.json();
  const { level, changedAt } = body;

  if (!level || !VALID_LEVELS.includes(level)) {
    return Response.json({ error: "Invalid level" }, { status: 400 });
  }
  if (!changedAt || isNaN(Date.parse(changedAt))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const entry = await prisma.tskLevelHistory.create({
    data: { participantId, level, changedAt: new Date(changedAt) },
  });

  return Response.json({ success: true, id: entry.id });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const body = await req.json();
  const { historyId } = body;

  if (!historyId) return Response.json({ error: "historyId required" }, { status: 400 });

  await prisma.tskLevelHistory.deleteMany({
    where: { id: historyId, participantId },
  });

  return Response.json({ success: true });
}
