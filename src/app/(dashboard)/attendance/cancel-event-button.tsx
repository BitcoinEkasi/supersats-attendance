"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelEventButton({
  eventId,
  cancelled,
  eventDate,
  mobile = false,
}: {
  eventId: string;
  cancelled: boolean;
  eventDate: string;
  mobile?: boolean;
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

  if (mobile) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold transition-all disabled:opacity-40 active:scale-98 ${
            cancelled
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          {loading ? "Saving…" : cancelled ? "✓ Restore Session" : "✕ Cancel Session (unsafe conditions)"}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
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
