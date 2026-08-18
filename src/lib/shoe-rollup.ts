import { TSK_GROUPS, TSK_GROUP_LABELS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";
import { SHOE_SIZES } from "@/lib/shoe-sizes";

export const NOT_RECORDED = "No Size";

export type ShoeRollupParticipant = { tskStatus: string | null; shoeSize: string | null };

export type ShoeRollupRow = {
  key: TskGroupKey | "NO_GROUP";
  label: string;
  counts: Record<string, number>;
  total: number;
};

export type ShoeRollup = {
  rows: ShoeRollupRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

const ALL_COLUMNS = [...SHOE_SIZES, NOT_RECORDED];

export function computeShoeRollup(participants: ShoeRollupParticipant[]): ShoeRollup {
  const rowKeys: (TskGroupKey | "NO_GROUP")[] = [...TSK_GROUPS, "NO_GROUP"];
  const rows: ShoeRollupRow[] = rowKeys.map((key) => ({
    key,
    label: key === "NO_GROUP" ? "No Group" : TSK_GROUP_LABELS[key],
    counts: Object.fromEntries(ALL_COLUMNS.map((s) => [s, 0])),
    total: 0,
  }));
  const rowByKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<TskGroupKey | "NO_GROUP", ShoeRollupRow>;

  const columnTotals: Record<string, number> = Object.fromEntries(ALL_COLUMNS.map((s) => [s, 0]));
  let grandTotal = 0;

  for (const p of participants) {
    const group = getGroupForStatus(p.tskStatus) ?? "NO_GROUP";
    const row = rowByKey[group];
    const sizeKey = p.shoeSize && (SHOE_SIZES as readonly string[]).includes(p.shoeSize) ? p.shoeSize : NOT_RECORDED;
    row.counts[sizeKey] += 1;
    row.total += 1;
    columnTotals[sizeKey] += 1;
    grandTotal += 1;
  }

  return { rows, columnTotals, grandTotal };
}
