import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";
import { computeAttendanceStats } from "@/lib/attendance-stats";

// Public, unauthenticated — deliberately never reads participantId so
// per-participant attendance can't be requested through this surface.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const groupParam = searchParams.get("group");

  if (!month) return Response.json({ error: "month is required" }, { status: 400 });

  const group = groupParam && isValidGroup(groupParam) ? (groupParam as TskGroupKey) : undefined;
  const data = await computeAttendanceStats({ month, group });
  return Response.json(data);
}
