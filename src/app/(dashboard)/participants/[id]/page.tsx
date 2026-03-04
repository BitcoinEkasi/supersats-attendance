import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import EditParticipantForm from "./edit-participant-form";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        orderBy: { date: "desc" },
        take: 100,
      },
    },
  });

  if (!participant) notFound();

  const totalRecords = participant.attendanceRecords.filter(
    (r) => r.status !== 0,
  ).length;
  const attended = participant.attendanceRecords.filter(
    (r) => r.status === 1,
  ).length;
  const percentage = totalRecords > 0 ? (attended / totalRecords) * 100 : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">
        {participant.displayName}
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EditParticipantForm participant={participant} />

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance Summary
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
                <p className="text-sm text-gray-500">Total Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{attended}</p>
                <p className="text-sm text-gray-500">Attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Rate</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Attendance
            </h3>
            {participant.attendanceRecords.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No attendance records yet.
              </p>
            ) : (
              <div className="mt-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participant.attendanceRecords.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-2">
                          {record.date.toISOString().split("T")[0]}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.status === 1
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {record.status === 1 ? "Present" : "Absent"}
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
