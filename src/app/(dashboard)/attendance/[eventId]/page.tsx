import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import AttendanceCapture from "./attendance-capture";
import CategorySelect from "./category-select";
import NoteInput from "./note-input";
import MidnightRedirect from "./midnight-redirect";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";
import { TSK_GROUP_LABELS, participantWhereForGroup, type TskGroupKey } from "@/lib/tsk-groups";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  BEACH_ACTIVITIES: "Beach Activities",
  SIMULATED_HEATS: "Simulated Heats",
  VIDEO_ANALYSIS: "Video Analysis",
  MENTAL_TRAINING: "Mental Training",
  SCORING_REVIEW: "Scoring Review",
  OTHER: "Other",
};

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth();
  const isMobile = session?.user?.role === "MARSHAL";

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendanceRecords: {
        select: { participantId: true, present: true },
      },
    },
  });

  if (!event) notFound();

  // Marshals may only access today's session
  if (isMobile) {
    const todayStart = getStartOfSASTToday();
    const todayEnd = getEndOfSASTToday();
    if (event.date < todayStart || event.date > todayEnd) {
      redirect("/attendance");
    }
    // Group Marshals may only access their own group's session
    const userGroup = session?.user?.group ?? null;
    if (userGroup && event.group && event.group !== userGroup) {
      redirect("/attendance");
    }
  }

  const eventDate = event.date;
  const groupFilter = event.group ? participantWhereForGroup(event.group as TskGroupKey) : {};

  const participants = await prisma.participant.findMany({
    where: {
      registrationDate: { lte: eventDate },
      OR: [
        { status: "ACTIVE" },
        { status: "RETIRED", retiredAt: { gte: eventDate } },
      ],
      ...groupFilter,
    },
    select: {
      id: true, surname: true, fullNames: true, knownAs: true,
      profilePicture: true, dateOfBirth: true, gender: true,
      isAssistantCoach: true, assistantCoachSince: true, tskStatus: true,
    },
    orderBy: [{ surname: "asc" }],
  });

  const groupLabel = event.group ? (TSK_GROUP_LABELS[event.group] ?? event.group) : null;

  if (isMobile) {
    return (
      <div className="flex flex-col">
        <MidnightRedirect />
        <div className="flex items-start justify-between border-b border-gray-100 bg-white px-4 py-4">
          <div className="w-full">
            <p className="font-semibold text-gray-900">
              {event.date.toLocaleDateString("en-GB", { weekday: "long" })} {fmtDate(event.date)}
              {groupLabel && (
                <span className="ml-2 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  {groupLabel}
                </span>
              )}
            </p>
            <CategorySelect eventId={event.id} category={event.category} group={event.group} />
            <NoteInput eventId={event.id} note={event.note} />
          </div>
        </div>

        {event.cancelled ? (
          <div className="px-4 py-8 text-center">
            <p className="text-lg font-semibold text-amber-700">Session Cancelled</p>
            <p className="mt-1 text-sm text-gray-500">This session is not counted toward rewards.</p>
          </div>
        ) : (
          <AttendanceCapture
            eventId={event.id}
            participants={participants}
            existing={event.attendanceRecords}
            mobile
          />
        )}
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
          {fmtDate(event.date)} — {categoryLabels[event.category] || event.category}
          {groupLabel && (
            <span className="ml-2 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-700">
              {groupLabel}
            </span>
          )}
        </h2>
      </div>

      {event.cancelled && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          This session was cancelled — attendance is not counted toward rewards.
        </div>
      )}

      {event.note && (
        <p className="mb-4 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700">{event.note}</p>
      )}

      {event.cancelled ? (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          Attendance capture is disabled for cancelled sessions.
        </p>
      ) : (
        <AttendanceCapture
          eventId={event.id}
          participants={participants}
          existing={event.attendanceRecords}
        />
      )}
    </div>
  );
}
