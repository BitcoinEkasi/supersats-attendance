import Link from "next/link";
import { prisma } from "@/lib/db";
import ParticipantSearch from "./participant-search";
import AddParticipantForm from "./add-participant-form";
import ParticipantImportForm from "./participant-import-form";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const where = search
    ? {
        OR: [
          { csvName: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const participants = await prisma.participant.findMany({
    where,
    orderBy: { displayName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ParticipantSearch initialSearch={search || ""} />

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Display Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    CSV Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {search
                        ? "No participants match your search."
                        : "No participants yet. Add one using the form."}
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{p.displayName}</td>
                      <td className="px-4 py-3 text-gray-600">{p.csvName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/participants/${p.id}`}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          Edit
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

        <div className="flex w-full flex-col gap-4 lg:w-80">
          <ParticipantImportForm />
          <AddParticipantForm />
        </div>
      </div>
    </div>
  );
}
