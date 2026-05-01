import Link from "next/link";
import { prisma } from "@/lib/db";
import ParticipantSearch from "./participant-search";
import ParticipantsExportButton from "./participants-export-button";
import { formatTenure, formatDuration, calculateAge, getDivisionLabel } from "@/lib/sa-id";
import { fmtDate } from "@/lib/format-date";
import { getBoltUser, getZarPerSat, satsToZar } from "@/lib/bolt";
import { TSK_GROUP_LEVELS } from "@/lib/tsk-groups";
import { getAcMultiplier } from "@/lib/tsk-levels";

const LEVEL_GROUPS = {
  turtles:     TSK_GROUP_LEVELS.TURTLES,
  seals:       TSK_GROUP_LEVELS.SEALS,
  dolphins:    TSK_GROUP_LEVELS.DOLPHINS,
  sharks:      TSK_GROUP_LEVELS.SHARKS,
  freesurfers: TSK_GROUP_LEVELS.FREE_SURFERS,
} as const;

type Tab = "active" | keyof typeof LEVEL_GROUPS | "ac" | "retired";

const VALID_TABS: Tab[] = ["active", "turtles", "seals", "dolphins", "sharks", "freesurfers", "ac", "retired"];

function getLevelFilter(tab: Tab) {
  if (tab in LEVEL_GROUPS) {
    return { tskStatus: { in: LEVEL_GROUPS[tab as keyof typeof LEVEL_GROUPS] as unknown as string[] } };
  }
  return {};
}

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tab?: string }>;
}) {
  const { search, tab: tabParam } = await searchParams;
  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "active";

  const searchWhere = search
    ? {
        OR: [
          { tskId: { contains: search } },
          { surname: { contains: search } },
          { fullNames: { contains: search } },
          { knownAs: { contains: search } },
        ],
      }
    : {};

  const statusFilter = tab === "retired" ? "RETIRED" : "ACTIVE";
  const levelFilter = getLevelFilter(tab);
  const acFilter = tab === "ac" ? { isAssistantCoach: true } : {};
  const where = { status: statusFilter as "ACTIVE" | "RETIRED", ...levelFilter, ...acFilter, ...searchWhere };

  const [
    participants,
    activeCount,
    turtlesCount,
    sealsCount,
    dolphinsCount,
    sharksCount,
    freesurfersCount,
    acCount,
    retiredCount,
  ] = await Promise.all([
    prisma.participant.findMany({ where, orderBy: [{ surname: "asc" }, { fullNames: "asc" }] }),
    prisma.participant.count({ where: { status: "ACTIVE" } }),
    prisma.participant.count({ where: { status: "ACTIVE", tskStatus: { in: [...LEVEL_GROUPS.turtles] } } }),
    prisma.participant.count({ where: { status: "ACTIVE", tskStatus: { in: [...LEVEL_GROUPS.seals] } } }),
    prisma.participant.count({ where: { status: "ACTIVE", tskStatus: { in: [...LEVEL_GROUPS.dolphins] } } }),
    prisma.participant.count({ where: { status: "ACTIVE", tskStatus: { in: [...LEVEL_GROUPS.sharks] } } }),
    prisma.participant.count({ where: { status: "ACTIVE", tskStatus: { in: [...LEVEL_GROUPS.freesurfers] } } }),
    prisma.participant.count({ where: { status: "ACTIVE", isAssistantCoach: true } }),
    prisma.participant.count({ where: { status: "RETIRED" } }),
  ]);

  const counts: Record<Tab, number> = {
    active: activeCount,
    turtles: turtlesCount,
    seals: sealsCount,
    dolphins: dolphinsCount,
    sharks: sharksCount,
    freesurfers: freesurfersCount,
    ac: acCount,
    retired: retiredCount,
  };

  const withBolt = participants.filter((p) => p.boltUserId);
  const [boltResults, zarPerSat] = await Promise.all([
    Promise.all(withBolt.map((p) => getBoltUser(p.boltUserId!).then((u) => ({ id: p.id, user: u })))),
    withBolt.length > 0 ? getZarPerSat() : Promise.resolve(null),
  ]);
  const boltMap = new Map(boltResults.map(({ id, user }) => [id, user]));

  const tabDef: { key: Tab; label: string; badge: string }[] = [
    { key: "active",      label: "All Active",  badge: "bg-green-100 text-green-700" },
    { key: "turtles",     label: "Turtles",     badge: "bg-teal-100 text-teal-700" },
    { key: "seals",       label: "Seals",       badge: "bg-cyan-100 text-cyan-700" },
    { key: "dolphins",    label: "Dolphins",    badge: "bg-blue-100 text-blue-700" },
    { key: "sharks",      label: "Sharks",      badge: "bg-purple-100 text-purple-700" },
    { key: "freesurfers", label: "Free Surfers",       badge: "bg-orange-100 text-orange-700" },
    { key: "ac",          label: "Assistant Coaches", badge: "bg-yellow-100 text-yellow-700" },
    { key: "retired",     label: "Retired",           badge: "bg-red-100 text-red-600" },
  ];

  const tabCls = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
  const selectedCls = "bg-white text-gray-900 shadow-sm border border-gray-200";
  const unselectedCls = "text-gray-500 hover:text-gray-700";

  function tabHref(key: Tab) {
    const params = new URLSearchParams();
    if (key !== "active") params.set("tab", key);
    if (search) params.set("search", search);
    const qs = params.toString();
    return `/participants${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
        <ParticipantsExportButton />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex items-center gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto">
        {tabDef.map(({ key, label, badge }) => (
          <Link key={key} href={tabHref(key)} className={`${tabCls} ${tab === key ? selectedCls : unselectedCls}`}>
            {label}
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${tab === key ? badge : "bg-gray-200 text-gray-500"}`}>
              {counts[key]}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <ParticipantSearch initialSearch={search || ""} tab={tab} />

        <div className="mt-4 space-y-2">
          {participants.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              {search
                ? "No participants match your search."
                : tab === "retired"
                  ? "No retired participants yet."
                  : tab === "ac"
                    ? "No assistant coaches yet."
                    : "No participants yet."}
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
                    {p.tskStatus && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                        {p.tskStatus}
                        {(p as any).isAssistantCoach && (p as any).assistantCoachSince && (
                          <> AC<sup className="text-[9px]">{getAcMultiplier((p as any).assistantCoachSince, new Date().toISOString().slice(0, 7))}</sup></>
                        )}
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
                    {(p as any).stance && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>Stance {(p as any).stance}</span>
                      </>
                    )}
                  </div>

                  {/* Joined / Retired */}
                  <div className="mt-0.5 text-xs text-gray-500">
                    {p.status === "ACTIVE" ? (
                      <>Active from {fmtDate(p.registrationDate)}, {formatTenure(p.registrationDate)}</>
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

                  {/* Payment info */}
                  {(p as any).paymentMethod === "LIGHTNING_ADDRESS" ? (
                    (p as any).lightningAddress && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        <span className="text-gray-400">⚡ Lightning</span>
                        <span className="ml-1 font-mono text-gray-600">{(p as any).lightningAddress}</span>
                      </div>
                    )
                  ) : p.boltUserId && (
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

      </div>
    </div>
  );
}
