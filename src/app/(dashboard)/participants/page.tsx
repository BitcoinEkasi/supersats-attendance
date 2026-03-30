import Link from "next/link";
import { prisma } from "@/lib/db";
import ParticipantSearch from "./participant-search";
import ParticipantsExportButton from "./participants-export-button";
import { formatTenure, calculateAge, getDivision } from "@/lib/sa-id";

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

        <div className="mt-4 space-y-2">
          {participants.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              {search
                ? "No participants match your search."
                : "No participants yet. Use \"Add Participant\" in the menu."}
            </div>
          ) : (
            participants.map((p) => (
              <Link
                key={p.id}
                href={`/participants/${p.id}`}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                {/* Profile picture */}
                <div className="shrink-0 h-12 w-12 rounded-full overflow-hidden">
                  {p.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profilePicture}
                      alt={p.knownAs || p.surname}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-orange-100 text-lg font-bold text-orange-600">
                      {(p.knownAs || p.surname).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  {/* Name */}
                  <div className="font-semibold text-gray-900">
                    {p.surname}, {p.fullNames}
                    {p.knownAs && (
                      <span className="ml-2 text-sm font-normal text-gray-500">({p.knownAs})</span>
                    )}
                  </div>

                  {/* TSK ID + badges */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs text-gray-500">{p.tskId}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                    </span>
                    {p.tskStatus && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                        {p.tskStatus}
                      </span>
                    )}
                    {p.isJuniorCoach && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        Junior Coach
                      </span>
                    )}
                  </div>

                  {/* Born · Age · Division · Gender */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <span>Born {p.dateOfBirth.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}</span>
                    <span className="text-gray-300">·</span>
                    <span>Age {calculateAge(p.dateOfBirth)}</span>
                    <span className="text-gray-300">·</span>
                    <span>Division {getDivision(p.dateOfBirth)} {p.gender === "MALE" ? "Boys" : "Girls"}</span>
                  </div>

                  {/* Joined */}
                  <div className="mt-0.5 text-xs text-gray-500">
                    Joined {p.registrationDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/(\d+)$/, "'$1")}, active for {formatTenure(p.registrationDate)}
                  </div>

                  {/* Card */}
                  {p.cardNumber && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-gray-400">Card</span>
                      <span className="font-mono">{p.cardNumber}</span>
                      {p.cardBalance != null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="font-medium">🗲 {Math.round(p.cardBalance).toLocaleString()} sats</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <p className="mt-3 text-sm text-gray-500">
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
