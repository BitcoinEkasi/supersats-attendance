"use client";

import { useState } from "react";
import Link from "next/link";
import { REWARD_TIERS } from "@/lib/rewards";
import { calculateAge, getDivisionLabel } from "@/lib/sa-id";

type Entry = {
  id: string;
  participantId: string;
  totalEvents: number;
  attended: number;
  percentage: string | number;
  rewardSats: number;
  payoutStatus: string;
  participant: {
    tskId: string;
    surname: string;
    fullNames: string;
    knownAs: string | null;
    dateOfBirth: Date | null;
    gender: "MALE" | "FEMALE" | null;
    isJuniorCoach: boolean;
  };
};

export default function ReportTable({ entries, reportMonth }: { entries: Entry[]; reportMonth: string }) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? entries.filter(({ participant: p }) =>
        `${p.surname} ${p.fullNames} ${p.knownAs ?? ""} ${p.tskId}`.toLowerCase().includes(q)
      )
    : entries;

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Search bar */}
      <div className="border-b px-4 py-3">
        <div className="relative max-w-sm">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm focus:border-orange-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">TSK ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Participant</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Age</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Division</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Events</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Attended</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Attendance %</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Reward (sats)</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                No participants match your search.
              </td>
            </tr>
          ) : (
            filtered.map((entry) => {
              const pct = Number(entry.percentage);
              const tier = REWARD_TIERS.find((t) =>
                t.sats === 7500 ? pct >= 100 : pct >= t.min && pct <= t.max,
              );
              const p = entry.participant;
              const name = `${p.surname}, ${p.fullNames}${p.knownAs ? ` (${p.knownAs})` : ""}`;

              return (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.tskId}</td>
                  <td className="px-4 py-3 font-medium">{name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.dateOfBirth ? calculateAge(p.dateOfBirth) : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.dateOfBirth && p.gender ? getDivisionLabel(p.dateOfBirth, p.gender) : "—"}</td>
                  <td className="px-4 py-3">{entry.totalEvents}</td>
                  <td className="px-4 py-3">{entry.attended}</td>
                  <td className="px-4 py-3">
                    <span className={tier?.color || ""}>{pct.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {p.isJuniorCoach ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Junior Coach</span>
                    ) : (
                      <>🗲 {entry.rewardSats.toLocaleString()}</>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isJuniorCoach ? null : entry.rewardSats === 0 ? (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">DNQ</span>
                    ) : entry.payoutStatus === "paid" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/participants/${entry.participantId}?month=${reportMonth}`}
                      className="text-xs text-orange-600 hover:underline whitespace-nowrap"
                    >
                      View Events
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
