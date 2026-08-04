import AttendanceChart from "@/app/(dashboard)/dashboard/attendance-chart";
import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";

// Public, unauthenticated Pulse/Trajectory viewer — reuses the same AttendanceChart
// the admin dashboard uses (see /chart-snapshot for the other existing example of
// rendering it outside the dashboard), just fetching from the public API routes and
// with flag-click-to-edit disabled. No participant selector exists in AttendanceChart
// anymore, and the public API routes never accept participantId regardless.
//
// Optional ?group=&month= deep-link (used by the nightly TSK Attendance email's
// "View live analytics" link) pre-seeds the filters via AttendanceChart's existing
// initialGroup/initialMonth props — the page stays fully interactive afterward,
// unlike /chart-snapshot's one-shot static render.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; month?: string }>;
}) {
  const { group: groupParam, month } = await searchParams;
  const group = groupParam && isValidGroup(groupParam) ? (groupParam as TskGroupKey) : undefined;
  return <AttendanceChart publicMode initialGroup={group} initialMonth={month} />;
}
