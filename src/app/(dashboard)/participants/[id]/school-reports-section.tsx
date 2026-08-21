"use client";

import { useState } from "react";
import Link from "next/link";
import type { SchoolReport } from "@prisma/client";

const TERMS = [
  { key: "term1", label: "1st Term" },
  { key: "term2", label: "2nd Term" },
  { key: "term3", label: "3rd Term" },
  { key: "term4", label: "Final Term" },
] as const;

function ReportYearBody({ report }: { report: SchoolReport }) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
      {TERMS.map(({ key, label }) => {
        const result = report[`${key}Result` as keyof SchoolReport] as number | null;
        const fileUrl = report[`${key}FileUrl` as keyof SchoolReport] as string | null;
        return (
          <div key={key} className="rounded bg-white p-2 border border-gray-100">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {result != null ? `${result}%` : <span className="text-gray-400">Not recorded</span>}
            </p>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                View report
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SchoolReportsSection({
  reports,
  grade,
}: {
  reports: SchoolReport[];
  grade: string | null;
}) {
  const currentYear = new Date().getFullYear();

  const years = [...new Set([currentYear, ...reports.map((r) => r.year)])].sort((a, b) => b - a);
  const reportByYear = Object.fromEntries(reports.map((r) => [r.year, r]));

  const [openYears, setOpenYears] = useState<Set<number>>(() => new Set([currentYear]));

  function toggleYear(year: number) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">School Reports</h3>
        <Link href="/data-sheets" className="text-xs text-orange-600 hover:underline">Edit from Data Sheets →</Link>
      </div>

      <div className="mt-1 space-y-2">
        {years.map((year) => {
          const isOpen = openYears.has(year);
          const report = reportByYear[year];
          const heading = grade ? `${year} — ${grade}` : `${year}`;

          return (
            <div key={year} className="rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{heading}</span>
                  {year === currentYear && (
                    <span className="text-xs text-orange-600">Current</span>
                  )}
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  {report
                    ? <ReportYearBody report={report} />
                    : <p className="pt-3 text-sm text-gray-400">No data recorded for this year.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
