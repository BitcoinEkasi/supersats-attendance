"use client";

import { useState } from "react";
import { updateEventNote } from "@/app/actions/attendance";

export default function NoteInput({
  eventId,
  note,
}: {
  eventId: string;
  note: string | null;
}) {
  const [value, setValue] = useState(note ?? "");

  async function handleBlur() {
    await updateEventNote(eventId, value.trim() || null);
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
