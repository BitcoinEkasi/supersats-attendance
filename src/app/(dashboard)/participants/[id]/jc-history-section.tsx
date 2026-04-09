"use client";

import { fmtDate } from "@/lib/format-date";

export type JcHistoryEntry = {
  id: string;
  level: number;
  startedAt: string | Date;
  endedAt: string | Date | null;
  endReason: string | null;
};

function formatDuration(from: Date, to: Date): string {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 1) return "< 1 month";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [
    y > 0 ? `${y} yr${y > 1 ? "s" : ""}` : "",
    m > 0 ? `${m} mo` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const JC_LEVEL_LABELS: Record<number, { label: string; multiplier: string; color: string }> = {
  1: { label: "Level 1",  multiplier: "×5",   color: "bg-blue-400" },
  2: { label: "Level 2",  multiplier: "×7.5",  color: "bg-blue-600" },
  3: { label: "Level 3",  multiplier: "×10",   color: "bg-blue-800" },
};

const END_REASON_LABELS: Record<string, string> = {
  manual:      "Manually removed",
  promoted:    "Promoted",
  shark_elite: "Reached Shark Elite",
  free_surfer: "Reached Free Surfer",
};

export default function JcHistorySection({ history }: { history: JcHistoryEntry[] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  const now = new Date();

  return (
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Junior Coach History</p>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-400">No Junior Coach history recorded yet.</p>
      )}

      {sorted.length > 0 && (
        <ol className="space-y-0">
          {sorted.map((entry, idx) => {
            const from = new Date(entry.startedAt);
            const to = entry.endedAt ? new Date(entry.endedAt) : now;
            const isActive = !entry.endedAt;
            const isLast = idx === sorted.length - 1;
            const duration = formatDuration(from, to);
            const meta = JC_LEVEL_LABELS[entry.level] ?? { label: `Level ${entry.level}`, multiplier: "", color: "bg-gray-400" };

            return (
              <li key={entry.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${meta.color}`} />
                  {!isLast && <span className="mt-1 w-0.5 flex-1 bg-gray-200" style={{ minHeight: "2rem" }} />}
                </div>

                <div className="flex flex-1 items-start justify-between pb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Junior Coach {meta.label}
                      <span className="ml-1 text-xs font-normal text-gray-400">{meta.multiplier}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fmtDate(from)}
                      {" → "}
                      {isActive ? "present" : fmtDate(to)}
                    </p>
                    {!isActive && entry.endReason && (
                      <p className="mt-0.5 text-xs text-gray-400 italic">
                        {END_REASON_LABELS[entry.endReason] ?? entry.endReason}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                    {duration}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
