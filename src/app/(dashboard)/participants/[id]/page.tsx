import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EditParticipantForm from "./edit-participant-form";
import ChangeRequestForm from "../change-request-form";
import { resolveChangeRequest } from "@/app/actions/participants";
import { formatTenure } from "@/lib/sa-id";
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
        include: { requestedByUser: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!participant) notFound();

  const totalEvents = participant.attendanceRecords.length;
  const attended = participant.attendanceRecords.filter((r) => r.present).length;
  const percentage = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    RETIRED: "bg-gray-100 text-gray-600",
    SUSPENDED: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        {participant.profilePicture ? (
          <Image
            src={participant.profilePicture}
            alt={participant.knownAs || participant.surname}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600">
            {(participant.knownAs || participant.surname).charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {participant.knownAs
              ? `${participant.knownAs} (${participant.surname})`
              : `${participant.surname}, ${participant.fullNames}`}
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
          </div>
        </div>
      </div>

      {/* Key info strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Date of Birth</p>
          <p className="mt-1 text-sm font-medium">
            {participant.dateOfBirth.toISOString().split("T")[0]}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Gender</p>
          <p className="mt-1 text-sm font-medium">
            {participant.gender.charAt(0) + participant.gender.slice(1).toLowerCase()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Member Since</p>
          <p className="mt-1 text-sm font-medium">
            {formatTenure(participant.registrationDate)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Overall Attendance</p>
          <p className="mt-1 text-sm font-medium">{percentage.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              {participant.boltCardUrl && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Bolt Card URL</dt>
                  <dd className="font-medium truncate max-w-48">{participant.boltCardUrl}</dd>
                </div>
              )}
            </dl>
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
                        By {req.requestedByUser.name} · {req.createdAt.toLocaleDateString()}
                      </span>
                      <form action={async () => { "use server"; await resolveChangeRequest(req.id); }}>
                        <button
                          type="submit"
                          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
                        >
                          Mark Resolved
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
                <p className="text-sm text-gray-500">Total Events</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{attended}</p>
                <p className="text-sm text-gray-500">Attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{percentage.toFixed(1)}%</p>
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
    </div>
  );
}
