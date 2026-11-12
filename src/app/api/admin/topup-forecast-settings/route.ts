import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getTopupSettings } from "@/lib/topup-forecast";

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getTopupSettings());
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const remainingSessions = Number(body.remainingSessions);
  const contingencyPercent = Number(body.contingencyPercent);
  const enabled = body.enabled !== false;
  const topupAddress = String(body.topupAddress ?? "").trim();

  if (!Number.isInteger(remainingSessions) || remainingSessions < 1 || remainingSessions > 20) {
    return Response.json({ error: "Remaining sessions must be a whole number from 1 to 20" }, { status: 400 });
  }
  if (!Number.isInteger(contingencyPercent) || contingencyPercent < 0 || contingencyPercent > 100) {
    return Response.json({ error: "Contingency must be a whole percentage from 0 to 100" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(topupAddress)) {
    return Response.json({ error: "Top-up address must be a Lightning address like name@domain" }, { status: 400 });
  }

  await getTopupSettings(); // ensure the row (and default recipient) exist
  const settings = await prisma.topupForecastSettings.update({
    where: { id: "default" },
    data: { remainingSessions, contingencyPercent, enabled, topupAddress, updatedBy: user.name ?? user.id },
  });
  return Response.json({ success: true, settings });
}
