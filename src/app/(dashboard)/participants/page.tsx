import Link from "next/link";
import { prisma } from "@/lib/db";
import ParticipantSearch from "./participant-search";
import ParticipantsExportButton from "./participants-export-button";
import { formatTenure, formatDuration, calculateAge, getDivisionLabel } from "@/lib/sa-id";
import { fmtDate } from "@/lib/format-date";
import { getBoltUser, getZarPerSat, satsToZar } from "@/lib/bolt";

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

  const [participants, activeCount, retiredCount] = await Promise.all([
    prisma.participant.findMany({ where, orderBy: [{ surname: "asc" }, { fullNames: "asc" }] }),
    prisma.participant.count({ where: { status: "ACTIVE" } }),
    prisma.participant.count({ where: { status: "RETIRED" } }),
  ]);

  const withBolt = participants.filter((p) => p.boltUserId);
  const [boltResults, zarPerSat] = await Promise.all([
    Promise.all(withBolt.map((p) => getBoltUser(p.boltUserId!).then((u) => ({ id: p.id, user: u })))),
    withBolt.length > 0 ? getZarPerSat() : Promise.resolve(null),
  ]);
  const boltMap = new Map(boltResults.map(({ id, user }) => [id, user]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-700">{activeCount} active</span>
          {retiredCount > 0 && (
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-500">{retiredCount} retired</span>
          )}
        </div>
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

                  {/* Born · Age · Division */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <span>Born on {fmtDate(p.dateOfBirth)}</span>
                    <span className="text-gray-300">·</span>
                    <span>Age {calculateAge(p.dateOfBirth)}</span>
                    <span className="text-gray-300">·</span>
                    <span>Division {getDivisionLabel(p.dateOfBirth, p.gender)}</span>
                  </div>

                  {/* Joined / Retired */}
                  <div className="mt-0.5 text-xs text-gray-500">
                    {p.status === "ACTIVE" ? (
                      <>Joined {fmtDate(p.registrationDate)}, active for {formatTenure(p.registrationDate)}</>
                    ) : p.retiredAt ? (
                      <>
                        Joined {fmtDate(p.registrationDate)}
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-red-500">Retired on {fmtDate(p.retiredAt)}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        after {formatDuration(p.registrationDate, p.retiredAt)}
                      </>
                    ) : (
                      <>Joined {fmtDate(p.registrationDate)}</>
                    )}
                  </div>

                  {/* Bolt card */}
                  {p.boltUserId && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      <span className="text-gray-400">Bolt Card</span>
                      {(() => {
                        const bu = boltMap.get(p.id);
                        if (!bu) return null;
                        return (
                          <>
                            {bu.card?.card_id && (
                              <span className="ml-1 font-mono text-gray-500">{bu.card.card_id}</span>
                            )}
                            <span className="ml-0.5">
                              ⚡ {bu.balance_sats.toLocaleString()} sats
                              {zarPerSat && ` (${satsToZar(bu.balance_sats, zarPerSat)})`}
                            </span>
                          </>
                        );
                      })()}
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
