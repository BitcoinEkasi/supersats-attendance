import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EditParticipantForm from "./edit-participant-form";
import ProfilePictureUpload from "./profile-picture-upload";
import ChangeRequestForm from "../change-request-form";
import PerformanceEventsSection from "./performance-events-section";
import ResolveButton from "./resolve-button";
import BoltCardSection from "./bolt-card-section";
import SchoolReportsSection from "./school-reports-section";
import { formatTenure, formatDuration, calculateAge, getDivisionLabel } from "@/lib/sa-id";
import { fmtDate } from "@/lib/format-date";
import { getBoltUser, getZarPerSat, satsToZar } from "@/lib/bolt";
import MonthlyAttendanceHistory from "./monthly-attendance-history";
import NotesSection from "./notes-section";
import TskReviewsSection from "./tsk-reviews-section";
import Image from "next/image";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role;

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      changeRequests: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
      certifications: { orderBy: { uploadedAt: "desc" } },
      performanceEvents: { orderBy: { eventDate: "desc" } },
      schoolReports: { orderBy: { year: "desc" } },
      tskReviews: { orderBy: { reviewDate: "desc" } },
    },
  });

  if (!participant) notFound();

  const [monthlyReportEntries, allAttendanceRecords] = await Promise.all([
    prisma.monthlyReportEntry.findMany({
      where: { participantId: id },
      include: { report: { select: { id: true, month: true, status: true } } },
      orderBy: { report: { month: "desc" } },
      take: 12,
    }),
    prisma.attendanceRecord.findMany({
      where: { participantId: id },
      include: { event: { select: { date: true, category: true } } },
      orderBy: { event: { date: "asc" } },
    }),
  ]);

  // Group sessions by YYYY-MM for the MonthlyAttendanceHistory component
  const sessionsByMonth: Record<string, { date: string; category: string; present: boolean }[]> = {};
  for (const record of allAttendanceRecords) {
    const d = record.event.date;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!sessionsByMonth[key]) sessionsByMonth[key] = [];
    sessionsByMonth[key].push({
      date: fmtDate(d),
      category: record.event.category,
      present: record.present,
    });
  }

  const historyEntries = monthlyReportEntries.map((entry) => ({
    id: entry.id,
    reportMonth: entry.report.month,
    attended: entry.attended,
    totalEvents: entry.totalEvents,
    percentage: Number(entry.percentage),
    rewardSats: entry.rewardSats,
    payoutStatus: entry.payoutStatus,
    reportStatus: entry.report.status,
  }));

  const boltUser = participant.boltUserId ? await getBoltUser(participant.boltUserId) : null;
  const zarPerSat = boltUser ? await getZarPerSat() : null;

  return (
    <div className="-m-6 flex h-full flex-col">
      {/* Pinned ID card — outside scroll area */}
      <div className="shrink-0 border-b-2 border-gray-200 bg-white shadow-md flex items-center">
        {/* Profile picture — circle */}
        <div className="shrink-0 ml-4 relative h-16 w-16">
          {role === "ADMINISTRATOR" ? (
            <ProfilePictureUpload
              participantId={participant.id}
              profilePicture={participant.profilePicture}
              initial={(participant.knownAs || participant.surname).charAt(0).toUpperCase()}
            />
          ) : participant.profilePicture ? (
            <Image
              src={participant.profilePicture}
              alt={participant.knownAs || participant.surname}
              width={64}
              height={64}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-orange-600">
              {(participant.knownAs || participant.surname).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {/* Text content — padded */}
        <div className="flex-1 px-4 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {participant.surname}, {participant.fullNames}
              {participant.knownAs && (
                <span className="ml-2 text-lg font-normal text-gray-500">({participant.knownAs})</span>
              )}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs text-gray-500">{participant.tskId}</span>
              {participant.tskStatus && (
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                  {participant.tskStatus}
                </span>
              )}
              {participant.isJuniorCoach && (
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                  Junior Coach
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <span>Born on {fmtDate(participant.dateOfBirth)}</span>
              <span className="text-gray-300">·</span>
              <span>Age {calculateAge(participant.dateOfBirth)}</span>
              <span className="text-gray-300">·</span>
              <span>Division {getDivisionLabel(participant.dateOfBirth, participant.gender)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              {participant.status === "ACTIVE" ? (
                <span>Active from {fmtDate(participant.registrationDate)}, {formatTenure(participant.registrationDate)}</span>
              ) : participant.retiredAt ? (
                <span>
                  Joined {fmtDate(participant.registrationDate)}
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="text-red-500">Retired on {fmtDate(participant.retiredAt)}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  after {formatDuration(participant.registrationDate, participant.retiredAt)}
                </span>
              ) : (
                <span>Joined {fmtDate(participant.registrationDate)}</span>
              )}
            </div>
            {(participant as any).paymentMethod === "LIGHTNING_ADDRESS" ? (
              (participant as any).lightningAddress && (
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <span className="text-gray-400">⚡ Lightning</span>
                  <span className="font-mono text-xs text-gray-600">{(participant as any).lightningAddress}</span>
                </div>
              )
            ) : participant.boltUserId && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                <span className="text-gray-400">Bolt Card</span>
                {boltUser?.card?.card_id && (
                  <span className="font-mono text-xs text-gray-500">{boltUser.card.card_id}</span>
                )}
                {boltUser && (
                  <span className="text-sm text-gray-500">
                    ⚡ {boltUser.balance_sats.toLocaleString()} sats
                    {zarPerSat && ` (${satsToZar(boltUser.balance_sats, zarPerSat)})`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed gap between header and scrollable content */}
      <div className="shrink-0 h-6 bg-gray-50 border-b border-gray-100" />

      {/* Scrollable content */}
      <div id="scroll-container" className="flex-1 overflow-y-auto bg-gray-50 px-6 pb-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {role === "ADMINISTRATOR" ? (
          <EditParticipantForm participant={participant} />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Participant Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Full Names</dt>
                <dd className="font-medium">{participant.fullNames}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Surname</dt>
                <dd className="font-medium">{participant.surname}</dd>
              </div>
              {participant.knownAs && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Known As</dt>
                  <dd className="font-medium">{participant.knownAs}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">SA ID Number</dt>
                <dd className="font-mono font-medium">{participant.idNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Active From</dt>
                <dd className="font-medium">{fmtDate(participant.registrationDate)}</dd>
              </div>
              {participant.status === "RETIRED" && participant.retiredAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Retired On</dt>
                  <dd className="font-medium text-red-600">{fmtDate(participant.retiredAt)}</dd>
                </div>
              )}
              {participant.ethnicity && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Ethnicity</dt>
                  <dd className="font-medium">{participant.ethnicity}</dd>
                </div>
              )}
              {participant.language && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Language</dt>
                  <dd className="font-medium">{participant.language}</dd>
                </div>
              )}
              {participant.school && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">School</dt>
                  <dd className="font-medium">{participant.school}</dd>
                </div>
              )}
              {participant.grade && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Grade</dt>
                  <dd className="font-medium">{participant.grade}</dd>
                </div>
              )}
              {participant.guardian && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Guardian</dt>
                  <dd className="font-medium">{participant.guardian}</dd>
                </div>
              )}
              {participant.guardianId && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Guardian ID</dt>
                  <dd className="font-mono font-medium">{participant.guardianId}</dd>
                </div>
              )}
              {participant.guardianRelationship && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Relationship</dt>
                  <dd className="font-medium">{participant.guardianRelationship}</dd>
                </div>
              )}
              {participant.address && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-right max-w-48">{participant.address}</dd>
                </div>
              )}
              {participant.contact1 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">1st Contact</dt>
                  <dd className="font-medium">{participant.contact1}</dd>
                </div>
              )}
              {participant.contact2 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">2nd Contact</dt>
                  <dd className="font-medium">{participant.contact2}</dd>
                </div>
              )}
              {participant.housingType && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Housing Type</dt>
                  <dd className="font-medium">{participant.housingType}</dd>
                </div>
              )}
              {(participant as any).paymentMethod === "LIGHTNING_ADDRESS" ? (
                (participant as any).lightningAddress && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Lightning Address</dt>
                    <dd className="font-mono text-sm">{(participant as any).lightningAddress}</dd>
                  </div>
                )
              ) : participant.boltUserId && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Bolt Card</dt>
                  <dd><span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">Issued</span></dd>
                </div>
              )}
              {participant.profilePicture && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Profile Link</dt>
                  <dd className="truncate max-w-48">
                    <a href={participant.profilePicture} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                      View
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {participant.notes && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{participant.notes}</p>
              </div>
            )}
            <div className="mt-4 border-t pt-4">
              <ChangeRequestForm participantId={participant.id} />
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Pending change requests — admin only */}
          {role === "ADMINISTRATOR" && participant.changeRequests.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold text-amber-900">
                Pending Change Requests ({participant.changeRequests.length})
              </h3>
              <div className="mt-3 space-y-3">
                {participant.changeRequests.map((req) => (
                  <div key={req.id} className="rounded-md border border-amber-200 bg-white p-3">
                    <p className="text-sm text-gray-700">{req.notes}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        By {req.requestedBy} · {fmtDate(req.createdAt)}
                      </span>
                      <ResolveButton requestId={req.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <BoltCardSection
            participantId={participant.id}
            boltUserId={participant.boltUserId ?? null}
            isAdmin={role === "ADMINISTRATOR"}
            prefetchedBoltUser={boltUser}
            paymentMethod={(participant as any).paymentMethod ?? "BOLT_CARD"}
            lightningAddress={(participant as any).lightningAddress ?? null}
          />

          <MonthlyAttendanceHistory
            entries={historyEntries}
            sessionsByMonth={sessionsByMonth}
            isJuniorCoach={participant.isJuniorCoach}
            juniorCoachLevel={(participant as any).juniorCoachLevel ?? null}
          />

          {role === "ADMINISTRATOR" && (
            <NotesSection
              participantId={participant.id}
              initialNotes={participant.notes}
            />
          )}

        </div>
      </div>

      {/* School Reports — full width */}
      {role === "ADMINISTRATOR" && (
        <div className="mt-6">
          <SchoolReportsSection
            participantId={participant.id}
            reports={participant.schoolReports}
          />
        </div>
      )}

      {/* TSK Reviews — full width */}
      {role === "ADMINISTRATOR" && (
        <div className="mt-6">
          <TskReviewsSection
            participantId={participant.id}
            reviews={participant.tskReviews}
          />
        </div>
      )}

      {/* Performance Events — full width at bottom */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Competitive Events</h3>
        <div className="mt-4">
          <PerformanceEventsSection
            participantId={participant.id}
            events={participant.performanceEvents}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
