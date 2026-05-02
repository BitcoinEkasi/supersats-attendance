import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { groupSortIndex } from "@/lib/tsk-groups";
import { ReportsTableClient } from "./reports-table-client";

export default async function ReportsPage() {
  const session = await auth();
  const role = session?.user?.role;

  const reports = await prisma.monthlyReport.findMany({
    orderBy: { month: "desc" },
    include: {
      entries: { select: { rewardSats: true, percentage: true } },
    },
  });

  // Serialize (convert Prisma Decimal → number) and group by month, sorting groups by canonical order
  const monthKeys: string[] = [];
  const byMonth: Record<string, { id: string; month: string; group: string | null; status: string; entries: { rewardSats: number; percentage: number }[] }[]> = {};
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
      entries: r.entries.map((e) => ({ rewardSats: e.rewardSats, percentage: Number(e.percentage) })),
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Rewards</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Avg Attendance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            {reports.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No reports yet. Reports will appear automatically once attendance is recorded.
                  </td>
                </tr>
              </tbody>
            ) : (
              <ReportsTableClient monthKeys={monthKeys} byMonth={byMonth} role={role} />
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
