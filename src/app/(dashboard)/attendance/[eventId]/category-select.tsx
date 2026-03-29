"use client";

import { useState } from "react";
import { updateEventCategory } from "@/app/actions/attendance";
import type { EventCategory } from "@prisma/client";

const categories: { value: EventCategory; label: string }[] = [
  { value: "SURFING", label: "Surfing" },
  { value: "FITNESS", label: "Fitness" },
  { value: "SKATING", label: "Skating" },
  { value: "BEACH_CLEAN_UP", label: "Beach Clean Up" },
  { value: "OTHER", label: "Other" },
];

export default function CategorySelect({
  eventId,
  category,
}: {
  eventId: string;
  category: EventCategory;
}) {
  const [current, setCurrent] = useState(category);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as EventCategory;
    setCurrent(next);
    await updateEventCategory(eventId, next);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer"
    >
      {categories.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}
