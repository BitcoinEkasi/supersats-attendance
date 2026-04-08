import { prisma } from "@/lib/db";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateEventForm from "./create-event-form";
import SessionsTable from "./sessions-table";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";

export default async function AttendancePage() {
  const session = await auth();
  const role = session?.user?.role;
  const isMobile = role === "MARSHALL";

  const todayStart = getStartOfSASTToday();
  const todayEnd = getEndOfSASTToday();

  if (isMobile) {
    const todayEvent = await prisma.event.findFirst({
      where: { date: { gte: todayStart, lte: todayEnd } },
      orderBy: { createdAt: "desc" },
    });

    if (todayEvent) {
      redirect(`/attendance/${todayEvent.id}`);
    }

    return <CreateEventForm mobile />;
  }

  // Desktop layout
  const [events, activeCount, todayEvent, approvedMonths] = await Promise.all([
    prisma.event.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { attendanceRecords: { where: { present: true } } } },
      },
    }),
    prisma.participant.count({ where: { status: "ACTIVE" } }),
    prisma.event.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.monthlyReport.findMany({
      where: { status: "APPROVED" },
      select: { month: true },
    }),
  ]);

  const eventRows = events.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    dateLabel: fmtDate(e.date),
    category: e.category,
    note: e.note,
    presentCount: e._count.attendanceRecords,
    monthKey: `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, "0")}`,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-gray-900">Sessions</h3>
            </div>
            <SessionsTable
              events={eventRows}
              activeCount={activeCount}
              approvedMonths={approvedMonths.map((r) => r.month)}
            />
          </div>
        </div>
        {todayEvent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Session</h3>
            <p className="mt-1 text-sm text-gray-500">
              A session is already active for {fmtDate(todayEvent.date)}.
            </p>
            <Link
              href={`/attendance/${todayEvent.id}`}
              className="mt-4 flex w-full items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Open Session
            </Link>
          </div>
        ) : (
          <CreateEventForm />
        )}
      </div>
    </div>
  );
}
