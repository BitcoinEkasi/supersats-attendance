"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({ eventId, eventDate }: { eventId: string; eventDate: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Delete the session on ${eventDate}? This will remove all attendance records for that day.`)) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to delete");
    } else {
      router.refresh();
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-red-500 hover:text-red-700 disabled:opacity-40 text-sm"
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </span>
  );
}
