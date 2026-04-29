import { prisma } from "@/lib/db";
import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";

function formatEffectiveDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function PendingMovesTable() {
  const [participants, pendingChanges] = await Promise.all([
    prisma.participant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, tskStatus: true, isAssistantCoach: true },
    }),
    prisma.pendingParticipantChange.findMany({
      where: { appliedAt: null },
      include: { participant: { select: { tskStatus: true, isAssistantCoach: true } } },
    }),
  ]);

  if (pendingChanges.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
        No pending moves for next month.
      </div>
    );
  }

  // Current group counts
  const currentCounts: Record<TskGroupKey, number> = {
    TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0,
  };
  for (const p of participants) {
    const g = getGroupForStatus(p.tskStatus);
    if (g) currentCounts[g]++;
  }

  // Current AC count among active participants
  const currentAcCount = participants.filter((p) => p.isAssistantCoach).length;

  // Process pending tskStatus changes
  const departures: Record<TskGroupKey, number> = {
    TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0,
  };
  const arrivals: Record<TskGroupKey, number> = {
    TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0,
  };
  // within-group level changes: "Turtle L1 → Turtle L2" etc.
  const withinGroupChanges: { from: string; to: string }[] = [];

  // Cross-group flow summary for the "Change" column
  // departureDests[fromGroup] = map of toGroupLabel -> count
  const departureDests: Partial<Record<TskGroupKey, Record<string, number>>> = {};
  // arrivalSources[toGroup] = map of fromGroupLabel -> count
  const arrivalSources: Partial<Record<TskGroupKey, Record<string, number>>> = {};

  let acGaining = 0;
  let acLosing = 0;
  let effectiveFrom: Date | null = null;

  for (const change of pendingChanges) {
    if (!effectiveFrom || change.effectiveFrom > effectiveFrom) {
      effectiveFrom = change.effectiveFrom;
    }

    if (change.field === "tskStatus") {
      const fromGroup = getGroupForStatus(change.participant.tskStatus);
      const toGroup = getGroupForStatus(change.newValue);

      if (fromGroup !== toGroup) {
        if (fromGroup) {
          departures[fromGroup]++;
          const dest = TSK_GROUP_LABELS[toGroup ?? ""] ?? "Unassigned";
          if (!departureDests[fromGroup]) departureDests[fromGroup] = {};
          departureDests[fromGroup]![dest] = (departureDests[fromGroup]![dest] ?? 0) + 1;
        }
        if (toGroup) {
          arrivals[toGroup]++;
          const src = TSK_GROUP_LABELS[fromGroup ?? ""] ?? "Unassigned";
          if (!arrivalSources[toGroup]) arrivalSources[toGroup] = {};
          arrivalSources[toGroup]![src] = (arrivalSources[toGroup]![src] ?? 0) + 1;
        }
      } else if (fromGroup && change.participant.tskStatus && change.newValue) {
        withinGroupChanges.push({ from: change.participant.tskStatus, to: change.newValue });
      }
    } else if (change.field === "isAssistantCoach") {
      if (change.newValue === "true") acGaining++;
      else acLosing++;
    }
  }

  const hasCrossGroupMoves = TSK_GROUPS.some((g) => departures[g] > 0 || arrivals[g] > 0);
  const hasAcChanges = acGaining > 0 || acLosing > 0;
  const hasWithinGroup = withinGroupChanges.length > 0;

  // Deduplicate within-group changes for display
  const withinGroupSummary: Record<string, number> = {};
  for (const { from, to } of withinGroupChanges) {
    const key = `${from} → ${to}`;
    withinGroupSummary[key] = (withinGroupSummary[key] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h3 className="text-base font-semibold text-gray-900">Next Month Preview</h3>
        {effectiveFrom && (
          <span className="text-sm text-gray-400">Effective {formatEffectiveDate(effectiveFrom)}</span>
        )}
      </div>

      {hasCrossGroupMoves && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Now</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Next Month</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {TSK_GROUPS.map((group) => {
                const current = currentCounts[group];
                const dep = departures[group];
                const arr = arrivals[group];
                const projected = current - dep + arr;
                const delta = projected - current;

                const changeParts: string[] = [];
                if (dep > 0) {
                  const dests = departureDests[group];
                  if (dests) {
                    for (const [label, count] of Object.entries(dests)) {
                      changeParts.push(`${count > 1 ? `${count} × ` : ""}→ ${label}`);
                    }
                  }
                }
                if (arr > 0) {
                  const srcs = arrivalSources[group];
                  if (srcs) {
                    for (const [label, count] of Object.entries(srcs)) {
                      changeParts.push(`${count > 1 ? `${count} × ` : ""}← ${label}`);
                    }
                  }
                }

                return (
                  <tr key={group} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{TSK_GROUP_LABELS[group]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{current}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      <span className={delta < 0 ? "text-red-600" : delta > 0 ? "text-green-700" : "text-gray-900"}>
                        {projected}
                      </span>
                      {delta !== 0 && (
                        <span className={`ml-1.5 text-xs ${delta < 0 ? "text-red-400" : "text-green-500"}`}>
                          ({delta > 0 ? "+" : ""}{delta})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {changeParts.length > 0 ? changeParts.join("  ·  ") : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(hasWithinGroup || hasAcChanges) && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 space-y-1">
          {hasWithinGroup && (
            <div>
              <span className="font-medium text-gray-700">Level changes within groups: </span>
              {Object.entries(withinGroupSummary).map(([label, count], i) => (
                <span key={label}>
                  {i > 0 && <span className="mx-2 text-gray-300">·</span>}
                  {count > 1 && <span className="font-medium">{count} × </span>}
                  {label}
                </span>
              ))}
            </div>
          )}
          {hasAcChanges && (
            <div>
              <span className="font-medium text-gray-700">Assistant Coaches: </span>
              {acGaining > 0 && <span className="text-green-700">+{acGaining} gaining</span>}
              {acGaining > 0 && acLosing > 0 && <span className="mx-2 text-gray-300">·</span>}
              {acLosing > 0 && <span className="text-red-600">−{acLosing} losing</span>}
              <span className="ml-2 text-gray-400">
                ({currentAcCount - acLosing + acGaining} total next month)
              </span>
            </div>
          )}
        </div>
      )}

      {!hasCrossGroupMoves && !hasWithinGroup && !hasAcChanges && (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No pending moves for next month.
        </div>
      )}
    </div>
  );
}
