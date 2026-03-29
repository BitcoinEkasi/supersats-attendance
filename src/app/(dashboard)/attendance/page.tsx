import { prisma } from "@/lib/db";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateEventForm from "./create-event-form";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

const categoryColors: Record<string, string> = {
  SURFING: "bg-blue-100 text-blue-700",
  FITNESS: "bg-green-100 text-green-700",
  SKATING: "bg-purple-100 text-purple-700",
  BEACH_CLEAN_UP: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default async function AttendancePage() {
  const session = await auth();
  const role = session?.user?.role;
  const isMobile = role === "MARSHALL";

  const todayStart = getStartOfSASTToday();
  const todayEnd = getEndOfSASTToday();

  if (isMobile) {
    // If there's already an event today, go straight to it
    const todayEvent = await prisma.event.findFirst({
      where: { date: { gte: todayStart, lte: todayEnd } },
      orderBy: { createdAt: "desc" },
    });

    if (todayEvent) {
      redirect(`/attendance/${todayEvent.id}`);
    }

    // No event yet — show category picker
    return <CreateEventForm mobile />;
  }

  // Desktop layout
  const [events, activeCount] = await Promise.all([
    prisma.event.findMany({
      orderBy: { date: "desc" },
      take: 30,
      include: {
        _count: { select: { attendanceRecords: true } },
        creator: { select: { name: true } },
      },
    }),
    prisma.participant.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-gray-900">Events</h3>
            </div>
            {events.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No events yet. Create one to start capturing attendance.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Marked</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const marked = event._count.attendanceRecords;
                    const complete = marked >= activeCount;
                    return (
                      <tr key={event.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{event.date.toISOString().split("T")[0]}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[event.category] || "bg-gray-100 text-gray-600"}`}>
                            {categoryLabels[event.category] || event.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={complete ? "text-green-600 font-medium" : "text-amber-600"}>
                            {marked}/{activeCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{event.note || "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/attendance/${event.id}`} className="text-orange-600 hover:text-orange-800">
                            {complete ? "View" : "Capture"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <CreateEventForm />
      </div>
    </div>
  );
}
