"use client";

import { useState } from "react";
import { createParticipant } from "@/app/actions/participants";
import { useRouter } from "next/navigation";

export default function AddParticipantForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createParticipant(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      e.currentTarget.reset();
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Add Participant</h3>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            name="displayName"
            required
            placeholder="e.g. Olwenene Appolis"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            CSV Name (exact match from presli.io)
          </label>
          <input
            name="csvName"
            required
            placeholder='e.g. Appolis, Olwenene Avile, Boy, 7'
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bolt Card ID (optional)
          </label>
          <input
            name="boltCardId"
            placeholder="For future BTCPay integration"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Participant"}
        </button>
      </form>
    </div>
  );
}
