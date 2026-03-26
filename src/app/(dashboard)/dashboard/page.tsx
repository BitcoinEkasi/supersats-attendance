import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { checkUnreportedPreviousMonth } from "@/app/actions/reports";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

  const [activeCount, thisMonthEvents, recentEvents, recentReports, unreportedMonth] =
    await Promise.all([
      prisma.participant.count({ where: { status: "ACTIVE" } }),
      prisma.event.count({ where: { date: { gte: monthStart, lte: monthEnd } } }),
      prisma.event.findMany({
        orderBy: { date: "desc" },
        take: 5,
        include: {
          _count: { select: { attendanceRecords: true } },
          creator: { select: { name: true } },
        },
      }),
      prisma.monthlyReport.findMany({
        orderBy: { generatedAt: "desc" },
        take: 5,
        include: { generator: { select: { name: true } } },
      }),
      checkUnreportedPreviousMonth(),
    ]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Unreported month banner (admin only) */}
      {unreportedMonth && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>{unreportedMonth}</strong> has events but no report yet.
          </p>
          <Link
            href="/reports"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Generate Report
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Active Participants</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Events This Month</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{thisMonthEvents}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Reports Generated</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{recentReports.length}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
            <Link href="/attendance" className="text-sm text-orange-600 hover:text-orange-800">
              View all
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No events yet. Create one from the Attendance page.
            </p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Marked</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="py-2">{event.date.toISOString().split("T")[0]}</td>
                    <td className="py-2 text-gray-600">
                      {categoryLabels[event.category] || event.category}
                    </td>
                    <td className="py-2">{event._count.attendanceRecords}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(role === "ADMINISTRATOR" || role === "SUPERVISOR") && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
              <Link href="/reports" className="text-sm text-orange-600 hover:text-orange-800">
                View all
              </Link>
            </div>
            {recentReports.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No reports yet.
              </p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">Month</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Generated by</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">
                        <Link href={`/reports/${report.id}`} className="text-orange-600 hover:text-orange-800">
                          {report.month}
                        </Link>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            report.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {report.status === "APPROVED" ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600">{report.generator.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
