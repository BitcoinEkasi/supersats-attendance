"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelEventButton({
  eventId,
  cancelled,
  eventDate,
}: {
  eventId: string;
  cancelled: boolean;
  eventDate: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    if (!cancelled) {
      if (
        !window.confirm(
          `Mark session on ${eventDate} as cancelled? Attendance records are kept but this session will be excluded from reward calculations.`
        )
      )
        return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelled: !cancelled }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to update");
    } else {
      router.refresh();
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`text-sm disabled:opacity-40 ${
          cancelled
            ? "text-green-600 hover:text-green-800"
            : "text-amber-600 hover:text-amber-800"
        }`}
      >
        {loading ? "Saving…" : cancelled ? "Restore" : "Cancel"}
      </button>
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </span>
  );
}
