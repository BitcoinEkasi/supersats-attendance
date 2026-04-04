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
import { formatTenure, calculateAge, getDivisionLabel } from "@/lib/sa-id";
import { getSASTNow, getStartOfSASTMonth } from "@/lib/sast";
import { getBoltUser, getZarPerSat, satsToZar } from "@/lib/bolt";
import Image from "next/image";

const categoryLabels: Record<string, string> = {
  SURFING: "Surfing",
  FITNESS: "Fitness",
  SKATING: "Skating",
  BEACH_CLEAN_UP: "Beach Clean Up",
  OTHER: "Other",
};

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ id }, { month: filterMonth }] = await Promise.all([params, searchParams]);
  const session = await auth();
  const role = session?.user?.role;

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          event: { select: { date: true, category: true } },
        },
      },
      changeRequests: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
      certifications: { orderBy: { uploadedAt: "desc" } },
      performanceEvents: { orderBy: { eventDate: "desc" } },
      schoolReports: { orderBy: { year: "desc" } },
    },
  });

  if (!participant) notFound();

  // Last 3 months attendance
  const { year, month } = getSASTNow();
  const threeMonthsAgoMonth = month - 2 <= 0 ? month - 2 + 12 : month - 2;
  const threeMonthsAgoYear = month - 2 <= 0 ? year - 1 : year;
  const threeMonthsAgoYM = `${threeMonthsAgoYear}-${String(threeMonthsAgoMonth).padStart(2, "0")}`;

  const [last3mEvents, last3mAttended, monthlyReportEntries, filterMonthEvents] = await Promise.all([
    prisma.attendanceRecord.count({ where: { participantId: id, event: { date: { gte: getStartOfSASTMonth(threeMonthsAgoYM) } } } }),
    prisma.attendanceRecord.count({ where: { participantId: id, present: true, event: { date: { gte: getStartOfSASTMonth(threeMonthsAgoYM) } } } }),
    prisma.monthlyReportEntry.findMany({
      where: { participantId: id },
      include: { report: { select: { id: true, month: true, status: true } } },
      orderBy: { report: { month: "desc" } },
      take: 12,
    }),
    filterMonth
      ? prisma.attendanceRecord.findMany({
          where: {
            participantId: id,
            event: {
              date: {
                gte: getStartOfSASTMonth(filterMonth),
                lt: getStartOfSASTMonth(
                  (() => {
                    const [y, m] = filterMonth.split("-").map(Number);
                    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
                    return next;
                  })()
                ),
              },
            },
          },
          include: { event: { select: { date: true, category: true } } },
          orderBy: { event: { date: "asc" } },
        })
      : Promise.resolve(null),
  ]);

  const last3mPct = last3mEvents > 0 ? (last3mAttended / last3mEvents) * 100 : 0;

  const boltUser = participant.boltUserId ? await getBoltUser(participant.boltUserId) : null;
  const zarPerSat = boltUser ? await getZarPerSat() : null;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    RETIRED: "bg-gray-100 text-gray-600",
  };

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
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-gray-500">{participant.tskId}</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[participant.status] || "bg-gray-100 text-gray-600"
                }`}
              >
                {participant.status.charAt(0) + participant.status.slice(1).toLowerCase()}
              </span>
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
              <span>Born on {participant.dateOfBirth.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}</span>
              <span className="text-gray-300">·</span>
              <span>Age {calculateAge(participant.dateOfBirth)}</span>
              <span className="text-gray-300">·</span>
              <span>Division {getDivisionLabel(participant.dateOfBirth, participant.gender)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <span>Joined {participant.registrationDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}, active for {formatTenure(participant.registrationDate)}</span>
            </div>
            {participant.boltUserId && (
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
                <dt className="text-gray-500">Date From</dt>
                <dd className="font-medium">{participant.registrationDate.toISOString().split("T")[0]}</dd>
              </div>
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
              {participant.boltUserId && (
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
                        By {req.requestedBy} · {req.createdAt.toLocaleDateString()}
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
          />

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
            <p className="mt-1 text-xs text-gray-400">Last 3 months</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{last3mEvents}</p>
                <p className="text-sm text-gray-500">Events</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{last3mAttended}</p>
                <p className="text-sm text-gray-500">Attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{last3mPct.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Rate</p>
              </div>
            </div>
          </div>

          {filterMonth && filterMonthEvents && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Events — {filterMonth}</h3>
                <a href={`/participants/${id}`} className="text-xs text-gray-500 hover:text-gray-700">Clear filter ×</a>
              </div>
              {filterMonthEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No events recorded for this month.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterMonthEvents.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-2">{record.event.date.toISOString().split("T")[0]}</td>
                        <td className="py-2 text-gray-600">{categoryLabels[record.event.category] || record.event.category}</td>
                        <td className="py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${record.present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {record.present ? "Present" : "Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Attendance</h3>
            {participant.attendanceRecords.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No attendance records yet.</p>
            ) : (
              <div className="mt-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participant.attendanceRecords.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-2">
                          {record.event.date.toISOString().split("T")[0]}
                        </td>
                        <td className="py-2 text-gray-600">
                          {categoryLabels[record.event.category] || record.event.category}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.present
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {record.present ? "Present" : "Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

      {/* Monthly Rewards History */}
      {monthlyReportEntries.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Rewards History</h3>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Month</th>
                <th className="pb-2">Attendance</th>
                <th className="pb-2">Reward</th>
                <th className="pb-2">Payout</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {monthlyReportEntries.map((entry) => {
                const pct = Number(entry.percentage);
                const isJC = participant.isJuniorCoach;
                return (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{entry.report.month}</td>
                    <td className="py-2">{entry.attended}/{entry.totalEvents} ({pct.toFixed(1)}%)</td>
                    <td className="py-2">
                      {isJC ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Junior Coach</span>
                      ) : entry.rewardSats === 0 ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">DNQ</span>
                      ) : (
                        <span className="text-orange-600 font-medium">⚡ {entry.rewardSats.toLocaleString()} sats</span>
                      )}
                    </td>
                    <td className="py-2">
                      {entry.rewardSats > 0 && !isJC && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entry.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {entry.payoutStatus === "paid" ? "Paid" : "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <a
                        href={`/participants/${id}?month=${entry.report.month}`}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        View Events
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Performance Events — full width at bottom */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Events</h3>
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
