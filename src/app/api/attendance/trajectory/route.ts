import { requireAuth } from "@/lib/api-auth";
import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { computeAttendanceTrajectory } from "@/lib/attendance-stats";

export async function GET(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupParam = searchParams.get("group");
  const participantId = searchParams.get("participantId") ?? undefined;

  const group = groupParam && isValidGroup(groupParam) ? (groupParam as TskGroupKey) : undefined;
  const data = await computeAttendanceTrajectory({ group, participantId });
  return Response.json(data);
}
