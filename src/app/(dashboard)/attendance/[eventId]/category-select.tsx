"use client";

import { useState } from "react";
import type { EventCategory } from "@prisma/client";

const categories: { value: EventCategory; label: string }[] = [
  { value: "SURFING", label: "Surfing" },
  { value: "FITNESS", label: "Fitness" },
  { value: "SKATING", label: "Skating" },
  { value: "BEACH_CLEAN_UP", label: "Beach Clean Up" },
  { value: "BEACH_ACTIVITIES", label: "Beach Activities" },
  { value: "SIMULATED_HEATS", label: "Simulated Heats" },
  { value: "VIDEO_ANALYSIS", label: "Video Analysis" },
  { value: "MENTAL_TRAINING", label: "Mental Training" },
  { value: "SCORING_REVIEW", label: "Scoring Review" },
  { value: "OTHER", label: "Other" },
];

export default function CategorySelect({ eventId, category }: { eventId: string; category: EventCategory }) {
  const [current, setCurrent] = useState(category);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as EventCategory;
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
      {categories.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </select>
  );
}
