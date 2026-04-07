"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AcademicPayout = {
  id: string;
  year: number;
  term: number;
  status: string;
  payoutStatus: string;
  totalPayoutSats: number;
  createdAt: string;
  _count: { entries: number };
  qualifyingCount: number;
};

export default function SchoolGradesPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<AcademicPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [term, setTerm] = useState("1");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/academic-payouts")
      .then((r) => r.json())
      .then((data) => { setPayouts(data); setLoading(false); });
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    const res = await fetch("/api/academic-payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: parseInt(year), term: parseInt(term) }),
    });
    const data = await res.json();
    setGenerating(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/school-grades/${data.id}`);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Grades</h2>
          <p className="mt-1 text-sm text-gray-500">
            Academic performance reward payouts — same scale as monthly attendance (70%→3000 sats, 100%→10000 sats).
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Generate New Report
        </button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Generate Payout Report</h3>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={2020}
                max={currentYear + 1}
                className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
                <option value="4">Term 4</option>
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No school grade payouts yet. Generate one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Year</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Term</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Participants</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Qualifying</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total Sats</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Payout</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.year}</td>
                  <td className="px-4 py-3">Term {p.term}</td>
                  <td className="px-4 py-3">{p._count.entries}</td>
                  <td className="px-4 py-3 text-green-700">{p.qualifyingCount}</td>
                  <td className="px-4 py-3 font-medium text-orange-600">
                    {p.totalPayoutSats > 0 ? `🗲 ${p.totalPayoutSats.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "APPROVED" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Approved</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.payoutStatus === "paid" ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                    ) : p.payoutStatus === "invoiced" ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Invoiced</span>
                    ) : (
                      <span className="text-xs text-gray-400">Unpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/school-grades/${p.id}`} className="text-xs text-orange-600 hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
