import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import AttendanceCapture from "./attendance-capture";
import CategorySelect from "./category-select";
import NoteInput from "./note-input";
import LogoutButton from "./logout-button";
import { getStartOfSASTToday } from "@/lib/sast";

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
  const session = await auth();
  const isMobile = session?.user?.role === "MARSHALL";

  // Participants registered strictly before today (SAST)
  const today = getStartOfSASTToday();

  const [event, participants] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendanceRecords: {
          select: { participantId: true, present: true, onTour: true },
        },
      },
    }),
    prisma.participant.findMany({
      where: {
        status: "ACTIVE",
        registrationDate: { lt: today },
      },
      select: {
        id: true, surname: true, fullNames: true, knownAs: true,
        profilePicture: true, dateOfBirth: true, gender: true, isJuniorCoach: true,
      },
      orderBy: [{ surname: "asc" }],
    }),
  ]);

  if (!event) notFound();

  if (isMobile) {
    return (
      <div className="flex flex-col">
        {/* Minimal event header */}
        <div className="flex items-start justify-between border-b border-gray-100 bg-white px-4 py-4">
          <div>
            <p className="font-semibold text-gray-900">
              {event.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <CategorySelect eventId={event.id} category={event.category} />
            <NoteInput eventId={event.id} note={event.note} />
          </div>
          <LogoutButton />
        </div>

        <AttendanceCapture
          eventId={event.id}
          participants={participants}
          existing={event.attendanceRecords}
          mobile
        />
      </div>
    );
  }

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
