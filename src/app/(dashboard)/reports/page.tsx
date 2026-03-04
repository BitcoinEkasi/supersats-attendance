import { prisma } from "@/lib/db";
import Link from "next/link";
import GenerateReportForm from "./generate-report-form";

export default async function ReportsPage() {
  const reports = await prisma.monthlyReport.findMany({
    orderBy: { generatedAt: "desc" },
    include: {
      admin: { select: { name: true } },
      entries: { select: { rewardSats: true, percentage: true } },
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Monthly Reports</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Participants
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Total Rewards
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Avg Attendance
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Generated
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No reports yet. Generate one using the form.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const totalSats = report.entries.reduce(
                      (sum, e) => sum + e.rewardSats,
                      0,
                    );
                    const avgPct =
                      report.entries.length > 0
                        ? report.entries.reduce(
                            (sum, e) => sum + Number(e.percentage),
                            0,
                          ) / report.entries.length
                        : 0;

                    return (
                      <tr key={report.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {report.month}
                        </td>
                        <td className="px-4 py-3">
                          {report.entries.length}
                        </td>
                        <td className="px-4 py-3 font-medium text-orange-600">
                          {totalSats.toLocaleString()} sats
                        </td>
                        <td className="px-4 py-3">{avgPct.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-gray-500">
                          {report.generatedAt.toLocaleDateString()}
                        </td>
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

        <GenerateReportForm />
      </div>
    </div>
  );
}
