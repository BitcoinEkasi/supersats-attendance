"use client";

import { useState } from "react";
import Link from "next/link";

export type DivisionRow = {
  division: string;
  count: number;
  levels: { level: string; n: number }[];
  participants: { id: string; tskId: string; name: string; level: string }[];
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function DivisionBreakdownClient({ rows, total }: { rows: DivisionRow[]; total: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (division: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(division)) next.delete(division); else next.add(division);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="w-6 px-3 py-3" />
            <th className="px-4 py-3 text-left font-medium text-gray-500">Division</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">#</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">TSK Levels</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ division, count, levels, participants }) => {
            const isOpen = expanded.has(division);
            return (
              <>
                <tr
                  key={division}
                  className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                  onClick={() => toggle(division)}
                >
                  <td className="px-3 py-3"><Chevron open={isOpen} /></td>
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

                {isOpen && (
                  <tr key={`${division}-detail`} className="border-b bg-gray-50 last:border-0">
                    <td colSpan={4} className="py-1">
                      {participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 px-4 py-1.5 text-xs">
                          <span className="w-16 shrink-0 font-mono text-gray-400">{p.tskId}</span>
                          <Link
                            href={`/participants/${p.id}`}
                            className="min-w-0 flex-1 truncate font-medium text-gray-700 hover:text-orange-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.name}
                          </Link>
                          <span className="shrink-0 text-gray-400">{p.level}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          <tr className="border-t bg-gray-50">
            <td className="px-3 py-3" />
            <td className="px-4 py-3 font-semibold text-gray-700">Total</td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-700">{total}</td>
            <td className="px-4 py-3 text-sm text-gray-400">
              {(() => {
                const boys  = rows.filter(r => !r.division.startsWith("Women") && !r.division.endsWith("Girls")).reduce((s, r) => s + r.count, 0);
                const girls = rows.filter(r =>  r.division.startsWith("Women") ||  r.division.endsWith("Girls")).reduce((s, r) => s + r.count, 0);
                return `(${boys} boys · ${girls} girls)`;
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
