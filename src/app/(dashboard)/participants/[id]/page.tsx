import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EditParticipantForm from "./edit-participant-form";
import ProfilePictureUpload from "./profile-picture-upload";
import ChangeRequestForm from "../change-request-form";
import PerformanceEventsSection from "./performance-events-section";
import ResolveButton from "./resolve-button";
import { formatTenure, calculateAge, getDivision } from "@/lib/sa-id";
import { getSASTNow, getStartOfSASTMonth } from "@/lib/sast";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    },
  });

  if (!participant) notFound();

  // Last 3 months attendance
  const { year, month } = getSASTNow();
  const threeMonthsAgoMonth = month - 2 <= 0 ? month - 2 + 12 : month - 2;
  const threeMonthsAgoYear = month - 2 <= 0 ? year - 1 : year;
  const threeMonthsAgoYM = `${threeMonthsAgoYear}-${String(threeMonthsAgoMonth).padStart(2, "0")}`;

  const [last3mEvents, last3mAttended] = await Promise.all([
    prisma.attendanceRecord.count({ where: { participantId: id, event: { date: { gte: getStartOfSASTMonth(threeMonthsAgoYM) } } } }),
    prisma.attendanceRecord.count({ where: { participantId: id, present: true, event: { date: { gte: getStartOfSASTMonth(threeMonthsAgoYM) } } } }),
  ]);

  const last3mPct = last3mEvents > 0 ? (last3mAttended / last3mEvents) * 100 : 0;

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
              <span>Division {getDivision(participant.dateOfBirth)} {participant.gender === "MALE" ? "Boys" : "Girls"}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <span>Joined {participant.registrationDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}, active for {formatTenure(participant.registrationDate)}</span>
            </div>
            {participant.cardNumber && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                <span className="text-gray-400">Card</span>
                <span className="font-mono">{participant.cardNumber}</span>
                {participant.cardBalance != null && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="font-medium">🗲 {Math.round(participant.cardBalance).toLocaleString()} sats</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed gap between header and scrollable content */}
      <div className="shrink-0 h-6 bg-gray-50 border-b border-gray-100" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 pb-6">
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
              {participant.cardNumber && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Card Number</dt>
                  <dd className="font-mono font-medium">{participant.cardNumber}</dd>
                </div>
              )}
              {participant.boltCardUrl && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Pull Payment Link</dt>
                  <dd className="font-medium truncate max-w-48">{participant.boltCardUrl}</dd>
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
