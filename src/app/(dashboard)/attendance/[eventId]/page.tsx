import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import AttendanceCapture from "./attendance-capture";
import CategorySelect from "./category-select";
import NoteInput from "./note-input";
import MidnightRedirect from "./midnight-redirect";
import { getStartOfSASTToday, getEndOfSASTToday } from "@/lib/sast";
import { fmtDate, fmtTime } from "@/lib/format-date";
import { TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import { groupAsOf, type LevelHistoryRow } from "@/lib/roster-history";

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

  const [activities, captureWindow] = await Promise.all([
    prisma.sessionActivity.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.attendanceRecord.aggregate({
      where: { eventId },
      _min: { createdAt: true },
      _max: { updatedAt: true },
    }),
  ]);

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

  // Group membership is resolved as of the event's own date, not the participant's current
  // tskStatus — otherwise a participant who has since transitioned groups vanishes from
  // every past session's roster they actually attended (their AttendanceRecord survives,
  // but nobody can see or correct it through this page). Same point-in-time approach as
  // report generation (src/lib/upsert-report.ts) — a strict superset of the old filter for
  // today/future sessions, since asOf = eventDate = "now or later" there.
  const [candidateParticipants, levelHistory] = await Promise.all([
    prisma.participant.findMany({
      where: {
        registrationDate: { lte: eventDate },
        OR: [
          { status: "ACTIVE" },
          { status: "RETIRED", retiredAt: { gt: eventDate } },
        ],
      },
      select: {
        id: true, surname: true, fullNames: true, knownAs: true,
        profilePicture: true, dateOfBirth: true, gender: true,
        isAssistantCoach: true, assistantCoachSince: true, tskStatus: true,
      },
      orderBy: [{ surname: "asc" }],
    }),
    event.group
      ? prisma.tskLevelHistory.findMany({
          select: { participantId: true, level: true, changedAt: true },
          orderBy: { changedAt: "asc" },
        })
      : Promise.resolve([] as LevelHistoryRow[]),
  ]);

  const historyByParticipant = new Map<string, LevelHistoryRow[]>();
  for (const row of levelHistory) {
    const arr = historyByParticipant.get(row.participantId);
    if (arr) arr.push(row);
    else historyByParticipant.set(row.participantId, [row]);
  }

  const participants = event.group
    ? candidateParticipants.filter(
        (p) => groupAsOf(historyByParticipant, p.id, eventDate, p.tskStatus) === (event.group as TskGroupKey)
      )
    : candidateParticipants;

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
            <CategorySelect eventId={event.id} category={event.category} group={event.group} activities={activities} />
            <NoteInput eventId={event.id} note={event.note} />
          </div>
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
          {fmtDate(event.date)} — {event.category}
          {groupLabel && (
            <span className="ml-2 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-700">
              {groupLabel}
            </span>
          )}
        </h2>
      </div>

      {groupLabel && (
        <p className="text-sm text-gray-500">Submitted by {groupLabel} Marshal</p>
      )}
      {captureWindow._min.createdAt && captureWindow._max.updatedAt && (
        <p className="mb-4 text-sm text-gray-500">
          Attendance captured between {fmtTime(captureWindow._min.createdAt)} and {fmtTime(captureWindow._max.updatedAt)}
        </p>
      )}

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
