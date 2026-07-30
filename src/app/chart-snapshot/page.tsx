import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { computeAttendanceStats } from "@/lib/attendance-stats";
import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";
import AttendanceChart from "@/app/(dashboard)/dashboard/attendance-chart";

/** Internal-only render target for the TSK Attendance email's chart screenshot —
 *  outside the (dashboard) layout group (no sidebar/nav), reached only by the
 *  headless-browser screenshot step in src/lib/render-chart-screenshot.ts, which
 *  sets the same bearer secret the cron-triggered admin routes already use.
 *  Pre-fetches server-side (rather than letting AttendanceChart's own client fetch
 *  run) since a headless-browser page has no session cookie to authenticate with. */
export default async function ChartSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string }>;
}) {
  const bearer = (await headers()).get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || bearer !== cronSecret) notFound();

  const { group: groupParam, month } = await searchParams;
  if (!month || !groupParam || !isValidGroup(groupParam)) notFound();
  const group = groupParam as TskGroupKey;

  const data = await computeAttendanceStats({ month, group });

  return (
    <div style={{ background: "#ffffff", width: 900 }}>
      <AttendanceChart initialGroup={group} initialMonth={month} initialData={data} />
    </div>
  );
}
