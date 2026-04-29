"use client";

import { useState } from "react";
import Link from "next/link";
import type { TskGroupKey } from "@/lib/tsk-groups";

export type MonthData = {
  monthKey: string;
  effectiveDateLabel: string;
  groups: {
    key: TskGroupKey;
    label: string;
    current: number;
    projected: number;
    delta: number;
    changeSummary: string;
    departingParticipants: {
      participantId: string;
      name: string;
      tskId: string;
      fromLevel: string | null;
      toLevel: string | null;
      toGroup: TskGroupKey | null;
    }[];
    arrivingParticipants: {
      participantId: string;
      name: string;
      tskId: string;
      fromLevel: string | null;
      toLevel: string | null;
      fromGroup: TskGroupKey | null;
    }[];
  }[];
  withinGroupChanges: {
    label: string;
    count: number;
    participants: {
      participantId: string;
      name: string;
      tskId: string;
      fromLevel: string | null;
      toLevel: string | null;
      group: TskGroupKey;
    }[];
  }[];
  acChanges: { participantId: string; name: string; tskId: string; gaining: boolean }[];
  acGaining: number;
  acLosing: number;
  currentAcTotal: number;
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

function ParticipantRow({ id, tskId, name, from, to }: { id: string; tskId: string; name: string; from: string | null; to: string | null }) {
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 text-xs">
      <span className="w-16 shrink-0 font-mono text-gray-400">{tskId}</span>
      <Link href={`/participants/${id}`} className="min-w-0 flex-1 truncate font-medium text-gray-700 hover:text-orange-600">
        {name}
      </Link>
      <span className="shrink-0 text-gray-400">
        {from ?? "—"} <span className="text-gray-300">→</span> {to ?? "—"}
      </span>
    </div>
  );
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-ZA", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

export default function PendingMovesClient({ months }: { months: MonthData[] }) {
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.monthKey ?? "");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedWithinGroup, setExpandedWithinGroup] = useState(false);
  const [expandedAc, setExpandedAc] = useState(false);

  const data = months.find((m) => m.monthKey === selectedMonth);
  if (!data) return null;

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const changeMonth = (mk: string) => {
    setSelectedMonth(mk);
    setExpandedGroups(new Set());
    setExpandedWithinGroup(false);
    setExpandedAc(false);
  };

  const hasCrossGroupMoves = data.groups.some((g) => g.delta !== 0);
  const hasWithinGroup = data.withinGroupChanges.length > 0;
  const hasAcChanges = data.acChanges.length > 0;

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Effective {data.effectiveDateLabel}</span>
          {months.length > 1 && (
            <select
              value={selectedMonth}
              onChange={(e) => changeMonth(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-1 pl-2 pr-7 text-sm text-gray-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {months.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>{formatMonthLabel(m.monthKey)}</option>
              ))}
            </select>
          )}
          {months.length === 1 && (
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-500">
              {formatMonthLabel(selectedMonth)}
            </span>
          )}
        </div>
      </div>

      {/* Group table */}
      {hasCrossGroupMoves && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="w-6 px-3 py-3" />
                <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Now</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Next Month</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.map((group) => {
                const hasDetail = group.departingParticipants.length > 0 || group.arrivingParticipants.length > 0;
                const isOpen = expandedGroups.has(group.key);

                return (
                  <>
                    <tr
                      key={group.key}
                      className={`border-b last:border-0 ${hasDetail ? "cursor-pointer hover:bg-gray-50" : ""}`}
                      onClick={() => hasDetail && toggleGroup(group.key)}
                    >
                      <td className="px-3 py-3">
                        {hasDetail && <Chevron open={isOpen} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{group.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{group.current}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        <span className={group.delta < 0 ? "text-red-600" : group.delta > 0 ? "text-green-700" : "text-gray-900"}>
                          {group.projected}
                        </span>
                        {group.delta !== 0 && (
                          <span className={`ml-1.5 text-xs ${group.delta < 0 ? "text-red-400" : "text-green-500"}`}>
                            ({group.delta > 0 ? "+" : ""}{group.delta})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {group.changeSummary || <span className="text-gray-300">—</span>}
                      </td>
                    </tr>

                    {hasDetail && isOpen && (
                      <tr key={`${group.key}-detail`} className="border-b last:border-0 bg-gray-50">
                        <td colSpan={5} className="py-2">
                          {group.departingParticipants.length > 0 && (
                            <div className="mb-1">
                              <p className="px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                Departing
                              </p>
                              {group.departingParticipants.map((p) => (
                                <ParticipantRow key={p.participantId} id={p.participantId} tskId={p.tskId} name={p.name} from={p.fromLevel} to={p.toLevel} />
                              ))}
                            </div>
                          )}
                          {group.arrivingParticipants.length > 0 && (
                            <div>
                              <p className="px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                Arriving
                              </p>
                              {group.arrivingParticipants.map((p) => (
                                <ParticipantRow key={p.participantId} id={p.participantId} tskId={p.tskId} name={p.name} from={p.fromLevel} to={p.toLevel} />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Within-group level changes */}
      {hasWithinGroup && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => setExpandedWithinGroup((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
          >
            <Chevron open={expandedWithinGroup} />
            <span className="font-medium text-gray-700">Level changes within groups</span>
            <span className="ml-auto text-gray-400">
              {data.withinGroupChanges.reduce((s, c) => s + c.count, 0)} participant{data.withinGroupChanges.reduce((s, c) => s + c.count, 0) !== 1 ? "s" : ""}
            </span>
          </button>
          {expandedWithinGroup && (
            <div className="border-t pb-2">
              {data.withinGroupChanges.map((wg) => (
                <div key={wg.label} className="mt-2">
                  <p className="px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {wg.label}
                  </p>
                  {wg.participants.map((p) => (
                    <ParticipantRow key={p.participantId} id={p.participantId} tskId={p.tskId} name={p.name} from={p.fromLevel} to={p.toLevel} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AC changes */}
      {hasAcChanges && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => setExpandedAc((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
          >
            <Chevron open={expandedAc} />
            <span className="font-medium text-gray-700">Assistant Coaches</span>
            <span className="ml-2 text-gray-500 text-xs">
              {data.acGaining > 0 && <span className="text-green-700">+{data.acGaining} gaining</span>}
              {data.acGaining > 0 && data.acLosing > 0 && <span className="mx-1.5 text-gray-300">·</span>}
              {data.acLosing > 0 && <span className="text-red-600">−{data.acLosing} losing</span>}
              <span className="ml-1.5 text-gray-400">({data.currentAcTotal - data.acLosing + data.acGaining} total next month)</span>
            </span>
          </button>
          {expandedAc && (
            <div className="border-t pb-2">
              {data.acChanges.filter((c) => c.gaining).length > 0 && (
                <div className="mt-2">
                  <p className="px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Gaining AC</p>
                  {data.acChanges.filter((c) => c.gaining).map((p) => (
                    <ParticipantRow key={p.participantId} id={p.participantId} tskId={p.tskId} name={p.name} from="—" to="AC" />
                  ))}
                </div>
              )}
              {data.acChanges.filter((c) => !c.gaining).length > 0 && (
                <div className="mt-2">
                  <p className="px-4 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Losing AC</p>
                  {data.acChanges.filter((c) => !c.gaining).map((p) => (
                    <ParticipantRow key={p.participantId} id={p.participantId} tskId={p.tskId} name={p.name} from="AC" to="—" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!hasCrossGroupMoves && !hasWithinGroup && !hasAcChanges && (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No pending level changes.
        </div>
      )}
    </div>
  );
}
