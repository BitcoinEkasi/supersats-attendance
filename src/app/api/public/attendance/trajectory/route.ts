import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { computeAttendanceTrajectory } from "@/lib/attendance-stats";

// Public, unauthenticated — deliberately never reads participantId so
// per-participant attendance can't be requested through this surface.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupParam = searchParams.get("group");

  const group = groupParam && isValidGroup(groupParam) ? (groupParam as TskGroupKey) : undefined;
  const data = await computeAttendanceTrajectory({ group });
  return Response.json(data);
}
