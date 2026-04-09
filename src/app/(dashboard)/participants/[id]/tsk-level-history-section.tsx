"use client";

import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format-date";
import { TSK_LEVEL_MAP } from "@/lib/tsk-levels";

type HistoryEntry = { id: string; level: string; changedAt: string | Date };

function formatLevelDuration(from: Date, to: Date): string {
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

function levelColor(level: string): string {
  if (level.startsWith("Turtle")) return "bg-orange-400";
  if (level.startsWith("Seal")) return "bg-green-500";
  if (level.startsWith("Dolphin")) return "bg-blue-500";
  if (level.startsWith("Shark")) return "bg-purple-500";
  if (level === "Free Surfer") return "bg-teal-500";
  return "bg-gray-400";
}

export default function TskLevelHistorySection({
  participantId,
  history,
}: {
  participantId: string;
  history: HistoryEntry[];
}) {
  const router = useRouter();

  const sorted = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
  const now = new Date();

  async function handleDelete(historyId: string) {
    await fetch(`/api/participants/${participantId}/tsk-level-history`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId }),
    });
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Level Progression</p>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-400">No level history recorded yet.</p>
      )}

      {sorted.length > 0 && (
        <ol className="space-y-0">
          {sorted.map((entry, idx) => {
            const from = new Date(entry.changedAt);
            const to = idx < sorted.length - 1 ? new Date(sorted[idx + 1].changedAt) : now;
            const isLast = idx === sorted.length - 1;
            const duration = formatLevelDuration(from, to);

            return (
              <li key={entry.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${levelColor(entry.level)}`} />
                  {!isLast && <span className="mt-1 w-0.5 flex-1 bg-gray-200" style={{ minHeight: "2rem" }} />}
                </div>

                <div className="flex flex-1 items-start justify-between pb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{entry.level}</p>
                    {TSK_LEVEL_MAP[entry.level as keyof typeof TSK_LEVEL_MAP] && (
                      <p className="text-xs italic text-gray-400">{TSK_LEVEL_MAP[entry.level as keyof typeof TSK_LEVEL_MAP]}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fmtDate(from)}
                      {" → "}
                      {isLast ? "present" : fmtDate(to)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                      {duration}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      aria-label="Delete entry"
                      className="flex h-5 w-5 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
