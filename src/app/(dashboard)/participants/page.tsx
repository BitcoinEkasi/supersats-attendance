import Link from "next/link";
import { prisma } from "@/lib/db";
import ParticipantSearch from "./participant-search";
import ParticipantsExportButton from "./participants-export-button";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  RETIRED: "bg-gray-100 text-gray-600",
};

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const where = search
    ? {
        OR: [
          { tskId: { contains: search, mode: "insensitive" as const } },
          { surname: { contains: search, mode: "insensitive" as const } },
          { fullNames: { contains: search, mode: "insensitive" as const } },
          { knownAs: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const participants = await prisma.participant.findMany({
    where,
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
        <ParticipantsExportButton />
      </div>

      <div className="mt-6">
          <ParticipantSearch initialSearch={search || ""} />

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">TSK ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Photo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {search
                        ? "No participants match your search."
                        : "No participants yet. Use \"Add Participant\" in the menu."}
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.tskId}</td>
                      <td className="px-4 py-3">
                        {p.profilePicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.profilePicture}
                            alt={p.knownAs || p.surname}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-medium text-orange-600">
                            {(p.knownAs || p.surname).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.knownAs || `${p.surname} ${p.fullNames}`}</div>
                        {p.knownAs && (
                          <div className="text-xs text-gray-500">{p.surname}, {p.fullNames}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[p.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/participants/${p.id}`}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {participants.length} participant{participants.length !== 1 ? "s" : ""}
          </p>
      </div>
    </div>
  );
}
