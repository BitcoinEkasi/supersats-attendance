import { prisma } from "@/lib/db";
import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";
import PendingMovesClient, { type MonthData } from "./pending-moves-client";

function effectiveDateLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function participantName(p: { surname: string; fullNames: string; knownAs: string | null }): string {
  return `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;
}

export default async function PendingMovesTable() {
  const [participants, pendingChanges] = await Promise.all([
    prisma.participant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, tskStatus: true, isAssistantCoach: true },
    }),
    prisma.pendingParticipantChange.findMany({
      where: { appliedAt: null },
      include: {
        participant: {
          select: {
            id: true, tskId: true, surname: true, fullNames: true, knownAs: true,
            tskStatus: true, isAssistantCoach: true,
          },
        },
      },
      orderBy: { effectiveFrom: "asc" },
    }),
  ]);

  if (pendingChanges.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
        No pending level changes.
      </div>
    );
  }

  // Current group counts (always reflects live DB state)
  const currentCounts: Record<TskGroupKey, number> = {
    TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0,
  };
  for (const p of participants) {
    const g = getGroupForStatus(p.tskStatus);
    if (g) currentCounts[g]++;
  }
  const currentAcTotal = participants.filter((p) => p.isAssistantCoach).length;

  // Group changes by effective month
  const byMonth = new Map<string, typeof pendingChanges>();
  for (const c of pendingChanges) {
    const mk = c.effectiveFrom.toISOString().slice(0, 7);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk)!.push(c);
  }

  const months: MonthData[] = [...byMonth.entries()].map(([monthKey, changes]) => {
    const departures: Record<TskGroupKey, number> = { TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0 };
    const arrivals:   Record<TskGroupKey, number> = { TURTLES: 0, SEALS: 0, DOLPHINS: 0, SHARKS: 0, FREE_SURFERS: 0 };
    const departureDests:  Partial<Record<TskGroupKey, Record<string, number>>> = {};
    const arrivalSources:  Partial<Record<TskGroupKey, Record<string, number>>> = {};
    const departingFrom:   Partial<Record<TskGroupKey, MonthData["groups"][number]["departingParticipants"]>> = {};
    const arrivingTo:      Partial<Record<TskGroupKey, MonthData["groups"][number]["arrivingParticipants"]>> = {};
    const withinGroupMap:  Record<string, { count: number; participants: MonthData["withinGroupChanges"][number]["participants"] }> = {};
    const acChanges: MonthData["acChanges"] = [];

    for (const change of changes) {
      const p = change.participant;
      const name = participantName(p);

      if (change.field === "tskStatus") {
        const fromGroup = getGroupForStatus(p.tskStatus);
        const toGroup   = getGroupForStatus(change.newValue);

        if (fromGroup !== toGroup) {
          if (fromGroup) {
            departures[fromGroup]++;
            const dest = TSK_GROUP_LABELS[toGroup ?? ""] ?? "None";
            if (!departureDests[fromGroup]) departureDests[fromGroup] = {};
            departureDests[fromGroup]![dest] = (departureDests[fromGroup]![dest] ?? 0) + 1;
            if (!departingFrom[fromGroup]) departingFrom[fromGroup] = [];
            departingFrom[fromGroup]!.push({ participantId: p.id, name, tskId: p.tskId, fromLevel: p.tskStatus, toLevel: change.newValue, toGroup });
          }
          if (toGroup) {
            arrivals[toGroup]++;
            const src = TSK_GROUP_LABELS[fromGroup ?? ""] ?? "None";
            if (!arrivalSources[toGroup]) arrivalSources[toGroup] = {};
            arrivalSources[toGroup]![src] = (arrivalSources[toGroup]![src] ?? 0) + 1;
            if (!arrivingTo[toGroup]) arrivingTo[toGroup] = [];
            arrivingTo[toGroup]!.push({ participantId: p.id, name, tskId: p.tskId, fromLevel: p.tskStatus, toLevel: change.newValue, fromGroup });
          }
        } else if (fromGroup && p.tskStatus && change.newValue) {
          const key = `${p.tskStatus} → ${change.newValue}`;
          if (!withinGroupMap[key]) withinGroupMap[key] = { count: 0, participants: [] };
          withinGroupMap[key].count++;
          withinGroupMap[key].participants.push({ participantId: p.id, name, tskId: p.tskId, fromLevel: p.tskStatus, toLevel: change.newValue, group: fromGroup });
        }
      } else if (change.field === "isAssistantCoach") {
        acChanges.push({ participantId: p.id, name, tskId: p.tskId, gaining: change.newValue === "true" });
      }
    }

    const groups: MonthData["groups"] = TSK_GROUPS.map((group) => {
      const dep = departures[group];
      const arr = arrivals[group];
      const current = currentCounts[group];
      const projected = current - dep + arr;
      const delta = projected - current;

      const changeParts: string[] = [];
      if (dep > 0 && departureDests[group]) {
        for (const [label, count] of Object.entries(departureDests[group]!))
          changeParts.push(`${count > 1 ? `${count} × ` : ""}→ ${label}`);
      }
      if (arr > 0 && arrivalSources[group]) {
        for (const [label, count] of Object.entries(arrivalSources[group]!))
          changeParts.push(`${count > 1 ? `${count} × ` : ""}← ${label}`);
      }

      return {
        key: group,
        label: TSK_GROUP_LABELS[group],
        current,
        projected,
        delta,
        changeSummary: changeParts.join("  ·  "),
        departingParticipants: departingFrom[group] ?? [],
        arrivingParticipants:  arrivingTo[group]   ?? [],
      };
    });

    return {
      monthKey,
      effectiveDateLabel: effectiveDateLabel(monthKey),
      groups,
      withinGroupChanges: Object.entries(withinGroupMap).map(([label, { count, participants }]) => ({ label, count, participants })),
      acChanges,
      acGaining: acChanges.filter((c) => c.gaining).length,
      acLosing:  acChanges.filter((c) => !c.gaining).length,
      currentAcTotal,
    };
  });

  return <PendingMovesClient months={months} />;
}
