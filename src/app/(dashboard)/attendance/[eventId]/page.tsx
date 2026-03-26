import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AttendanceCapture from "./attendance-capture";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, participants] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendanceRecords: {
          select: { participantId: true, present: true },
        },
        creator: { select: { name: true } },
      },
    }),
    prisma.participant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, surname: true, fullNames: true, knownAs: true },
      orderBy: [{ surname: "asc" }],
    }),
  ]);

  if (!event) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/attendance" className="text-sm text-gray-500 hover:text-gray-700">
          ← Attendance
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-xl font-bold text-gray-900">
          {event.date.toISOString().split("T")[0]} — {categoryLabels[event.category] || event.category}
        </h2>
      </div>

      {event.note && (
        <p className="mb-4 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700">{event.note}</p>
      )}

      <AttendanceCapture
        eventId={event.id}
        participants={participants}
        existing={event.attendanceRecords}
      />
    </div>
  );
}
