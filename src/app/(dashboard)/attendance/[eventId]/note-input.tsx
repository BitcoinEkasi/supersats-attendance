"use client";

import { useState } from "react";

export default function NoteInput({ eventId, note }: { eventId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");

  async function handleBlur() {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: value.trim() || null }),
    });
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="Add a note…"
      className="w-full text-xs text-gray-500 bg-transparent border-none outline-none placeholder-gray-300"
    />
  );
}
