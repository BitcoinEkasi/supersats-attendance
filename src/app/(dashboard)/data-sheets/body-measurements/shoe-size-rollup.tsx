import { SHOE_SIZES } from "@/lib/shoe-sizes";
import { NOT_RECORDED, type ShoeRollup } from "@/lib/shoe-rollup";
import { TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";
import ShoeRollupExportButtons from "./shoe-rollup-export-buttons";

const COLUMNS = [...SHOE_SIZES, NOT_RECORDED];

export default function ShoeSizeRollup({ rollup, groupFilter }: { rollup: ShoeRollup; groupFilter: "all" | TskGroupKey }) {
  const thCls = "px-3 py-2 text-right font-medium text-gray-500 border-b whitespace-nowrap";
  const description = groupFilter === "all"
    ? "Active participants per group, by shoe size — for placing shoe orders."
    : `Active ${TSK_GROUP_LABELS[groupFilter]} participants, by shoe size — for placing shoe orders.`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{description}</p>
        <ShoeRollupExportButtons groupFilter={groupFilter} />
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500 border-b whitespace-nowrap">Group</th>
              {COLUMNS.map((c) => (
                <th key={c} className={thCls}>{c}</th>
              ))}
              <th className={`${thCls} font-semibold text-gray-700`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rollup.rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium whitespace-nowrap">{row.label}</td>
                {COLUMNS.map((c) => (
                  <td key={c} className="px-3 py-2 text-right text-gray-600">
                    {row.counts[c] > 0 ? row.counts[c] : <span className="text-gray-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{row.total}</td>
              </tr>
            ))}
            {groupFilter === "all" && (
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-4 py-2 font-semibold text-gray-900">Total</td>
                {COLUMNS.map((c) => (
                  <td key={c} className="px-3 py-2 text-right font-semibold text-gray-900">
                    {rollup.columnTotals[c] > 0 ? rollup.columnTotals[c] : <span className="text-gray-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{rollup.grandTotal}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
