import { prisma } from "@/lib/db";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateEventForm from "./create-event-form";
import SessionsTable from "./sessions-table";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";
import { TSK_GROUP_LABELS, isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";

export default async function AttendancePage() {
  const session = await auth();
  const role = session?.user?.role;
  const userGroup = session?.user?.group ?? null;
  const isMobile = role === "MARSHAL";

  const todayStart = getStartOfSASTToday();
  const todayEnd = getEndOfSASTToday();

  if (isMobile) {
    // For group Marshals: only look at sessions for their group
    const groupFilter = userGroup && isValidGroup(userGroup) ? { group: userGroup as TskGroupKey } : {};
    const todayEvents = await prisma.event.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, ...groupFilter },
      orderBy: { createdAt: "desc" },
    });

    if (todayEvents.length === 1) {
      redirect(`/attendance/${todayEvents[0].id}`);
    }

    if (todayEvents.length > 1) {
      return (
        <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
          <h1 className="text-2xl font-bold text-gray-900">Choose your session</h1>
          <p className="mt-1 text-sm text-gray-400">Multiple sessions are running today</p>
          <div className="mt-8 space-y-3">
            {todayEvents.map((e) => (
              <Link
                key={e.id}
                href={`/attendance/${e.id}`}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 text-left transition-all active:scale-98 hover:border-orange-400"
              >
                <span className="text-lg font-semibold text-gray-700">
                  {e.group ? TSK_GROUP_LABELS[e.group] ?? e.group : "All groups"}
                </span>
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return <CreateEventForm mobile fixedGroup={userGroup && isValidGroup(userGroup) ? userGroup as TskGroupKey : null} />;
  }

  // Desktop layout
  const [events, todayEvents, approvedReports] = await Promise.all([
    prisma.event.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { attendanceRecords: { where: { present: true } } } },
      },
    }),
    prisma.event.findMany({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.monthlyReport.findMany({
      where: { status: "APPROVED" },
      select: { month: true, group: true },
    }),
  ]);

  const eventRows = events.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    dateLabel: fmtDate(e.date),
    category: e.category,
    group: e.group,
    note: e.note,
    presentCount: e._count.attendanceRecords,
    monthKey: `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`,
  }));

  // Build "YYYY-MM:GROUP" keys for approved reports
  const approvedMonthGroups = approvedReports.map((r) => `${r.month}:${r.group ?? "null"}`);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-gray-900">Sessions</h3>
            </div>
            <SessionsTable events={eventRows} approvedMonthGroups={approvedMonthGroups} />
          </div>
        </div>

        <div className="space-y-4">
          {todayEvents.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Sessions</h3>
              <div className="mt-3 space-y-2">
                {todayEvents.map((e) => (
                  <Link
                    key={e.id}
                    href={`/attendance/${e.id}`}
                    className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm border border-green-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">
                      {e.group ? TSK_GROUP_LABELS[e.group] ?? e.group : "All groups"}
                    </span>
                    <span className="text-orange-600 text-xs font-medium">Open →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <CreateEventForm />
        </div>
      </div>
    </div>
  );
}
