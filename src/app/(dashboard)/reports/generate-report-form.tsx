"use client";

import { useState } from "react";
import { generateMonthlyReport } from "@/app/actions/reports";
import { useRouter } from "next/navigation";
import { REWARD_TIERS } from "@/lib/rewards";

export default function GenerateReportForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Default to current month
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const month = formData.get("month") as string;

    const result = await generateMonthlyReport(month);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Report generated successfully!");
      router.refresh();
      // Navigate to the report
      if (result.reportId) {
        router.push(`/reports/${result.reportId}`);
      }
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Generate Report
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-600">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Month
            </label>
            <input
              name="month"
              type="month"
              defaultValue={defaultMonth}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Reward Tiers</h3>
        <div className="mt-4 space-y-2">
          {REWARD_TIERS.map((tier) => (
            <div
              key={tier.label}
              className="flex items-center justify-between text-sm"
            >
              <span className={tier.color + " font-medium"}>{tier.label}</span>
              <span className="font-mono text-gray-700">
                {tier.sats > 0 ? `${tier.sats.toLocaleString()} sats` : "No reward"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
