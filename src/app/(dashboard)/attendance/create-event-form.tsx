"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EventCategory } from "@prisma/client";
import { getSASTDateString } from "@/lib/sast";

const categories: { value: EventCategory; label: string }[] = [
  { value: "SURFING", label: "Surfing" },
  { value: "FITNESS", label: "Fitness" },
  { value: "SKATING", label: "Skating" },
  { value: "BEACH_CLEAN_UP", label: "Beach Clean Up" },
  { value: "OTHER", label: "Other" },
];

export default function CreateEventForm({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<EventCategory | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For mobile: refresh the page at SAST midnight so the date label updates
  useEffect(() => {
    if (!mobile) return;
    const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const sastNow = now + SAST_OFFSET_MS;
    const d = new Date(sastNow);
    const nextMidnightUTC =
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - SAST_OFFSET_MS;
    const ms = nextMidnightUTC - now;
    const timer = setTimeout(() => router.refresh(), ms);
    return () => clearTimeout(timer);
  }, [mobile, router]);

  async function handleMobileCreate() {
    if (!selected) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "today", category: selected, note: note.trim() || null }),
    });
    const result = await res.json();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/attendance/${result.id}`);
    }
  }

  if (mobile) {
    const [y, m, d] = getSASTDateString().split("-").map(Number);
    const today = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
    });

    return (
      <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">{today}</h1>
        <p className="mt-1 text-sm text-gray-400">Select a category to start</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-8 space-y-3">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelected(c.value)}
              className={`w-full rounded-2xl border-2 px-5 py-5 text-left text-lg font-semibold transition-all active:scale-98 ${
                selected === c.value
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-6 space-y-4">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base focus:border-orange-400 focus:outline-none"
            />
            <button
              onClick={handleMobileCreate}
              disabled={loading}
              className="w-full rounded-2xl bg-orange-600 py-5 text-lg font-bold text-white disabled:opacity-50 active:bg-orange-700"
            >
              {loading ? "Starting…" : "Start Session"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Desktop version
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [desktopError, setDesktopError] = useState("");
  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  async function handleDesktopSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDesktopLoading(true);
    setDesktopError("");
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: formData.get("date"),
        category: formData.get("category"),
        note: formData.get("note"),
      }),
    });
    const result = await res.json();
    if (res.status === 409 && result.existingId) {
      router.push(`/attendance/${result.existingId}`);
    } else if (result.error) {
      setDesktopError(result.error);
      setDesktopLoading(false);
    } else {
      router.push(`/attendance/${result.id}`);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Create Session</h3>
      <form onSubmit={handleDesktopSubmit} className="mt-4 space-y-4">
        {desktopError && (
          <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{desktopError}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date *</label>
          <input name="date" type="date" required defaultValue={getSASTDateString()} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category *</label>
          <select name="category" required className={inputCls}>
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <textarea name="note" rows={2} className={inputCls} placeholder="Optional note about this event" />
        </div>
        <button
          type="submit"
          disabled={desktopLoading}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {desktopLoading ? "Creating..." : "Create & Capture Attendance"}
        </button>
      </form>
    </div>
  );
}
