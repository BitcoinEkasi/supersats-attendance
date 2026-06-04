import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupSortIndex, type TskGroupKey } from "@/lib/tsk-groups";
import { getZarPerSat } from "@/lib/bolt";
import { ReportsTableClient } from "./reports-table-client";
import { upsertMonthlyReport } from "@/lib/upsert-report";

export default async function ReportsPage() {
  const session = await auth();
  const role = session?.user?.role;

  // Auto-refresh all pending reports from latest attendance data
  const pendingReports = await prisma.monthlyReport.findMany({
    where: { status: "PENDING" },
    select: { month: true, group: true, generatedBy: true },
  });
  await Promise.all(
    pendingReports.map((r) =>
      upsertMonthlyReport(r.month, r.generatedBy, (r.group as TskGroupKey | null) ?? null)
    )
  );

  const [reports, zarPerSat] = await Promise.all([
    prisma.monthlyReport.findMany({
    orderBy: { month: "desc" },
    include: {
      entries: { select: { rewardSats: true, percentage: true, totalEvents: true } },
    },
  }),
    getZarPerSat().catch(() => null),
  ]);

  // Serialize (convert Prisma Decimal → number) and group by month, sorting groups by canonical order
  const monthKeys: string[] = [];
  const byMonth: Record<string, { id: string; month: string; group: string | null; status: string; entries: { rewardSats: number; percentage: number; totalEvents: number }[] }[]> = {};
  for (const r of reports) {
    if (!byMonth[r.month]) {
      monthKeys.push(r.month);
      byMonth[r.month] = [];
    }
    byMonth[r.month].push({
      id: r.id,
      month: r.month,
      group: r.group,
      status: r.status,
      zarPerSat: r.zarPerSat ?? null,
      entries: r.entries.map((e) => ({ rewardSats: e.rewardSats, percentage: Number(e.percentage), totalEvents: e.totalEvents })),
    });
  }
  for (const month of monthKeys) {
    byMonth[month].sort((a, b) => groupSortIndex(a.group) - groupSortIndex(b.group));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Monthly Reports</h2>
      <p className="mt-1 text-sm text-gray-500">Reports are generated automatically as attendance is recorded.</p>

      <div className="mt-6">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Month</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Participants</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sessions</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Rewards</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Avg Attendance
                  <span className="block text-xs font-normal text-gray-400">(rounded down to nearest 5%)</span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            {reports.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No reports yet. Reports will appear automatically once attendance is recorded.
                  </td>
                </tr>
              </tbody>
            ) : (
              <ReportsTableClient monthKeys={monthKeys} byMonth={byMonth} role={role} zarPerSat={zarPerSat ?? null} />
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
