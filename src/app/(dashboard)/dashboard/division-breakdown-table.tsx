import { prisma } from "@/lib/db";
import { getDivisionLabel } from "@/lib/sa-id";
import { TSK_LEVELS } from "@/lib/tsk-levels";

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

export default async function DivisionBreakdownTable() {
  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: { dateOfBirth: true, gender: true, tskStatus: true },
  });

  const divisionMap = new Map<string, Map<string, number>>();
  let total = 0;

  for (const p of participants) {
    if (!p.dateOfBirth || !p.gender) continue;
    total++;
    const division = getDivisionLabel(p.dateOfBirth, p.gender);
    if (!divisionMap.has(division)) divisionMap.set(division, new Map());
    const level = p.tskStatus ?? "Unassigned";
    const m = divisionMap.get(division)!;
    m.set(level, (m.get(level) ?? 0) + 1);
  }

  const rows = [...divisionMap.entries()]
    .sort(([a], [b]) => divisionSortKey(a) - divisionSortKey(b))
    .map(([division, levelMap]) => ({
      division,
      count: [...levelMap.values()].reduce((s, n) => s + n, 0),
      levels: [...levelMap.entries()]
        .sort(([a], [b]) => tskLevelSortKey(a) - tskLevelSortKey(b))
        .map(([level, n]) => ({ level, n })),
    }));

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
        No active participants.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Division</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">TSK Levels</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ division, count, levels }) => (
              <tr key={division} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{division}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{count}</td>
                <td className="px-4 py-3 text-gray-500">
                  {levels.map(({ level, n }, i) => (
                    <span key={level}>
                      {i > 0 && <span className="mx-1.5 text-gray-300">·</span>}
                      {level} <span className="text-gray-400">({n})</span>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-700">Total</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-700">{total}</td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
  );
}
