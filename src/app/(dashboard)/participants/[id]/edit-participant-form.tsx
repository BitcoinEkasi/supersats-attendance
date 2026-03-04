"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateParticipant, deleteParticipant } from "@/app/actions/participants";
import type { Participant } from "@prisma/client";

export default function EditParticipantForm({
  participant,
}: {
  participant: Participant;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const result = await updateParticipant(participant.id, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Participant updated successfully");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this participant?")) return;
    const result = await deleteParticipant(participant.id);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/participants");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Edit Participant</h3>

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
            Display Name
          </label>
          <input
            name="displayName"
            defaultValue={participant.displayName}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            CSV Name (exact match from presli.io)
          </label>
          <input
            name="csvName"
            defaultValue={participant.csvName}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bolt Card ID (optional)
          </label>
          <input
            name="boltCardId"
            defaultValue={participant.boltCardId || ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="hidden"
            name="isActive"
            value={participant.isActive ? "true" : "false"}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              defaultChecked={participant.isActive}
              onChange={(e) => {
                const hidden = e.target
                  .closest("div")
                  ?.querySelector('input[name="isActive"]') as HTMLInputElement;
                if (hidden) hidden.value = e.target.checked ? "true" : "false";
              }}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Active
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
