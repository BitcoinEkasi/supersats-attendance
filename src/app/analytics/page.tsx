import AttendanceChart from "@/app/(dashboard)/dashboard/attendance-chart";

// Public, unauthenticated Pulse/Trajectory viewer — reuses the same AttendanceChart
// the admin dashboard uses (see /chart-snapshot for the other existing example of
// rendering it outside the dashboard), just fetching from the public API routes and
// with flag-click-to-edit disabled. No participant selector exists in AttendanceChart
// anymore, and the public API routes never accept participantId regardless.
export default function AnalyticsPage() {
  return <AttendanceChart publicMode />;
}
