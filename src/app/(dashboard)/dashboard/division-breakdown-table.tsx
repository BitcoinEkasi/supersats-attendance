import { prisma } from "@/lib/db";
import { getDivisionLabel } from "@/lib/sa-id";
import { TSK_LEVELS } from "@/lib/tsk-levels";
import DivisionBreakdownClient, { type DivisionRow } from "./division-breakdown-client";

const DIVISION_BASE_ORDER = ["U/8", "U/10", "U/12", "U/14", "U/16", "U/18", "Open"];
const TSK_LEVEL_ORDER: string[] = TSK_LEVELS.map((l) => l.value);

function divisionSortKey(label: string): number {
  const base = label.replace(/^(Men's Open|Women's Open)$/, "Open").replace(/ (Boys|Girls)$/, "");
  const baseIdx = DIVISION_BASE_ORDER.indexOf(base);
  const isFemale = label.startsWith("Women") || label.endsWith("Girls");
  return baseIdx * 2 + (isFemale ? 1 : 0);
}

function tskLevelSortKey(level: string): number {
  const idx = TSK_LEVEL_ORDER.indexOf(level);
  return idx === -1 ? 999 : idx;
}

function participantName(p: { surname: string; fullNames: string; knownAs: string | null }): string {
  return `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;
}

export default async function DivisionBreakdownTable() {
  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, tskId: true, surname: true, fullNames: true, knownAs: true, dateOfBirth: true, gender: true, tskStatus: true },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });

  const divisionMap = new Map<string, { levelCounts: Map<string, number>; participants: DivisionRow["participants"] }>();
  let total = 0;

  for (const p of participants) {
    if (!p.dateOfBirth || !p.gender) continue;
    total++;
    const division = getDivisionLabel(p.dateOfBirth, p.gender);
    if (!divisionMap.has(division)) divisionMap.set(division, { levelCounts: new Map(), participants: [] });
    const entry = divisionMap.get(division)!;
    const level = p.tskStatus ?? "Unassigned";
    entry.levelCounts.set(level, (entry.levelCounts.get(level) ?? 0) + 1);
    entry.participants.push({ id: p.id, tskId: p.tskId, name: participantName(p), level });
  }

  const rows: DivisionRow[] = [...divisionMap.entries()]
    .sort(([a], [b]) => divisionSortKey(a) - divisionSortKey(b))
    .map(([division, { levelCounts, participants }]) => ({
      division,
      count: participants.length,
      levels: [...levelCounts.entries()]
        .sort(([a], [b]) => tskLevelSortKey(a) - tskLevelSortKey(b))
        .map(([level, n]) => ({ level, n })),
      participants,
    }));

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
        No active participants.
      </div>
    );
  }

  return <DivisionBreakdownClient rows={rows} total={total} />;
}
