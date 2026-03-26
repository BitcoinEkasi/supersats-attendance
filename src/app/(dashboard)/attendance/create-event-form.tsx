"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions/attendance";

const categories = [
  { value: "SURFING", label: "Surfing" },
  { value: "FITNESS", label: "Fitness" },
  { value: "SKATING", label: "Skating" },
  { value: "BEACH_CLEAN_UP", label: "Beach Clean Up" },
  { value: "OTHER", label: "Other" },
];

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function CreateEventForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createEvent(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.id) {
      router.push(`/attendance/${result.id}`);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Create Event</h3>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Date *</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={todayString()}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category *</label>
          <select name="category" required className={inputCls}>
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <textarea
            name="note"
            rows={2}
            className={inputCls}
            placeholder="Optional note about this event"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create & Capture Attendance"}
        </button>
      </form>
    </div>
  );
}
