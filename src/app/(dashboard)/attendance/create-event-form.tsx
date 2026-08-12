"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSASTDateString } from "@/lib/sast";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";

type SessionActivityOption = { id: string; name: string; restrictedToGroup: string | null; requiresNote: boolean };

function visibleActivities(activities: SessionActivityOption[], group: string | null) {
  return activities.filter((a) => !a.restrictedToGroup || a.restrictedToGroup === group);
}

export default function CreateEventForm({
  mobile = false,
  fixedGroup = null,
  activities,
}: {
  mobile?: boolean;
  fixedGroup?: TskGroupKey | null;
  activities: SessionActivityOption[];
}) {
  const router = useRouter();
  const [group, setGroup] = useState<TskGroupKey | null>(fixedGroup);
  const [selected, setSelected] = useState<string | null>(null);
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

  const selectedActivity = activities.find((a) => a.name === selected);

  async function handleMobileCreate() {
    if (!selected || !group) return;
    if (selectedActivity?.requiresNote && !note.trim()) {
      setError(`A note is required when ${selected} is selected.`);
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "today", category: selected, group, note: note.trim() || null }),
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

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Step 1: Group selection (skipped when fixedGroup is set) */}
        {!group ? (
          <>
            <p className="mt-1 text-sm text-gray-400">Select your group</p>
            <div className="mt-8 space-y-3">
              {TSK_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-5 py-5 text-left text-lg font-semibold text-gray-700 transition-all active:scale-98"
                >
                  {TSK_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Step 2: Category selection */
          <>
            <p className="mt-1 text-sm text-gray-400">
              {fixedGroup ? (
                <span className="font-medium text-gray-600">{TSK_GROUP_LABELS[group]}</span>
              ) : (
                <button onClick={() => { setGroup(null); setSelected(null); }} className="text-orange-500 hover:underline">
                  {TSK_GROUP_LABELS[group]}
                </button>
              )}
              {" · "}Select an activity to start
            </p>

            <div className="mt-8 space-y-3">
              {visibleActivities(activities, group).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.name)}
                  className={`w-full rounded-2xl border-2 px-5 py-5 text-left text-lg font-semibold transition-all active:scale-98 ${
                    selected === a.name
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {selected && (
              <div className="mt-6 space-y-4">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={selectedActivity?.requiresNote ? "Describe the activity (required)" : "Add a note (optional)"}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-base focus:border-orange-400 focus:outline-none"
                />
                <button
                  onClick={handleMobileCreate}
                  disabled={loading || (!!selectedActivity?.requiresNote && !note.trim())}
                  className="w-full rounded-2xl bg-orange-600 py-5 text-lg font-bold text-white disabled:opacity-50 active:bg-orange-700"
                >
                  {loading ? "Starting…" : "Start Session"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Desktop version
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [desktopError, setDesktopError] = useState("");
  const [desktopGroup, setDesktopGroup] = useState<string>("");
  const [desktopCategory, setDesktopCategory] = useState<string>("");
  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";
  const desktopSelectedActivity = activities.find((a) => a.name === desktopCategory);

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
        group: formData.get("group"),
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
          <label className="block text-sm font-medium text-gray-700">Group *</label>
          <select name="group" required className={inputCls} value={desktopGroup} onChange={(e) => setDesktopGroup(e.target.value)}>
            <option value="">Select group...</option>
            {TSK_GROUPS.map((g) => (
              <option key={g} value={g}>{TSK_GROUP_LABELS[g]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date *</label>
          <input name="date" type="date" required defaultValue={getSASTDateString()} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Activity *</label>
          <select
            name="category"
            required
            className={inputCls}
            value={desktopCategory}
            onChange={(e) => setDesktopCategory(e.target.value)}
          >
            <option value="">Select activity...</option>
            {visibleActivities(activities, desktopGroup).map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Note{desktopSelectedActivity?.requiresNote ? " *" : ""}
          </label>
          <textarea
            name="note"
            rows={2}
            required={!!desktopSelectedActivity?.requiresNote}
            className={inputCls}
            placeholder={desktopSelectedActivity?.requiresNote ? "Describe the activity (required)" : "Optional note about this session"}
          />
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
