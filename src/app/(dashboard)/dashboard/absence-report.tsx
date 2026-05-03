import { prisma } from "@/lib/db";
import Link from "next/link";
import { TSK_GROUP_LABELS, TSK_GROUPS, groupSortIndex } from "@/lib/tsk-groups";

export default async function AbsenceReport() {
  const flags = await prisma.absenceFlag.findMany({
    include: {
      participant: {
        select: { id: true, surname: true, fullNames: true, knownAs: true },
      },
    },
  });

  if (flags.length === 0) {
    return (
      <p className="text-sm text-green-600 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        No absence alerts — all participants attended a recent session.
      </p>
    );
  }

  // Group by TSK group in canonical order; null group → "Unassigned"
  const byGroup = new Map<string | null, typeof flags>();
  for (const f of flags) {
    const g = f.group ?? null;
    const list = byGroup.get(g) ?? [];
    list.push(f);
    byGroup.set(g, list);
  }

  // Sort groups canonically; null last
  const sortedGroups = [...byGroup.keys()].sort((a, b) => groupSortIndex(a) - groupSortIndex(b));

  return (
    <div className="overflow-hidden rounded-md border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Participant</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Consecutive Sessions Missed</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((group) => {
            const groupFlags = (byGroup.get(group) ?? []).sort(
              (a, b) => b.consecutiveMissed - a.consecutiveMissed
            );
            const label = group ? (TSK_GROUP_LABELS[group] ?? group) : "Unassigned";
            return (
              <>
                <tr key={`group-${group}`} className="bg-orange-50 border-b border-gray-100">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-orange-700 uppercase tracking-wide">
                    {label} — {groupFlags.length} flagged
                  </td>
                </tr>
                {groupFlags.map((f) => {
                  const name = f.participant.knownAs
                    ? `${f.participant.surname}, ${f.participant.fullNames} (${f.participant.knownAs})`
                    : `${f.participant.surname}, ${f.participant.fullNames}`;
                  const isCritical = f.consecutiveMissed >= 4;
                  return (
                    <tr key={f.participantId} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-gray-600">{f.consecutiveMissed}</td>
                      <td className="px-4 py-3">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            4+ sessions missed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            3 sessions missed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/participants/${f.participant.id}`}
                          className="text-xs font-medium text-orange-600 hover:text-orange-800"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
