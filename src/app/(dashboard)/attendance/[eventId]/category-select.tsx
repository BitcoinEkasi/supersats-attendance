"use client";

import { useState } from "react";

type SessionActivityOption = { id: string; name: string; restrictedToGroup: string | null; requiresNote: boolean };

export default function CategorySelect({
  eventId,
  category,
  group,
  activities,
}: {
  eventId: string;
  category: string;
  group: string | null;
  activities: SessionActivityOption[];
}) {
  const [current, setCurrent] = useState(category);
  const visible = activities.filter((a) => !a.restrictedToGroup || a.restrictedToGroup === group);
  // The event's stored category may not be in the current activity list at all (renamed,
  // deleted, or a pre-migration enum-key value like "BEACH_CLEAN_UP") — show it as-is rather
  // than silently falling back to some other option in the dropdown.
  const currentIsListed = visible.some((a) => a.name === current);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: next }),
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer"
    >
      {!currentIsListed && <option value={current}>{current}</option>}
      {visible.map((a) => (
        <option key={a.id} value={a.name}>{a.name}</option>
      ))}
    </select>
  );
}
