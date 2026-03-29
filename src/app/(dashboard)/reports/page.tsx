import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await auth();
  const role = session?.user?.role;

  const reports = await prisma.monthlyReport.findMany({
    orderBy: { generatedAt: "desc" },
    include: {
      generator: { select: { name: true } },
      entries: { select: { rewardSats: true, percentage: true } },
    },
  });

  const statusBadge = (status: string) => {
    if (status === "APPROVED")
      return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>;
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Monthly Reports</h2>

      <p className="mt-1 text-sm text-gray-500">Reports are generated automatically as attendance is recorded.</p>

      <div className="mt-6">
        <div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Month</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Participants</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Total Rewards</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Avg Attendance</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No reports yet. Reports will appear automatically once attendance is recorded.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const totalSats = report.entries.reduce((sum, e) => sum + e.rewardSats, 0);
                    const avgPct =
                      report.entries.length > 0
                        ? report.entries.reduce((sum, e) => sum + Number(e.percentage), 0) /
                          report.entries.length
                        : 0;

                    return (
                      <tr key={report.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{report.month}</td>
                        <td className="px-4 py-3">{statusBadge(report.status)}</td>
                        <td className="px-4 py-3">{report.entries.length}</td>
                        <td className="px-4 py-3 font-medium text-orange-600">
                          {totalSats.toLocaleString()} sats
                        </td>
                        <td className="px-4 py-3">{avgPct.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/reports/${report.id}`}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
