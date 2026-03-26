"use client";

import { useState } from "react";
import { saveAttendance } from "@/app/actions/attendance";

type Participant = {
  id: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
};

type ExistingRecord = {
  participantId: string;
  present: boolean;
};

export default function AttendanceCapture({
  eventId,
  participants,
  existing,
}: {
  eventId: string;
  participants: Participant[];
  existing: ExistingRecord[];
}) {
  const initialState = new Map<string, boolean | null>();
  for (const p of participants) initialState.set(p.id, null);
  for (const r of existing) initialState.set(r.participantId, r.present);

  const [attendance, setAttendance] = useState<Map<string, boolean | null>>(
    new Map(initialState),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const marked = [...attendance.values()].filter((v) => v !== null).length;
  const total = participants.length;

  function toggle(participantId: string, present: boolean) {
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(participantId, present);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const records = [...attendance.entries()]
      .filter(([, v]) => v !== null)
      .map(([participantId, present]) => ({ participantId, present: present as boolean }));

    const result = await saveAttendance(eventId, records);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  function displayName(p: Participant) {
    return p.knownAs || `${p.surname} ${p.fullNames}`;
  }

  const sortedParticipants = [...participants].sort((a, b) =>
    displayName(a).localeCompare(displayName(b)),
  );

  return (
    <div className="mx-auto max-w-lg">
      {/* Counter bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          <span className={marked === total ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
            {marked}
          </span>
          <span className="text-gray-500"> / {total} marked</span>
        </span>
        <button
          onClick={handleSave}
          disabled={saving || marked === 0}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {sortedParticipants.map((p) => {
          const status = attendance.get(p.id);
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                status === null
                  ? "border-amber-200 bg-amber-50"
                  : status
                  ? "border-green-200 bg-green-50"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <span className="text-base font-medium text-gray-900">
                {displayName(p)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(p.id, true)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                    status === true
                      ? "bg-green-500 text-white shadow"
                      : "border border-gray-300 bg-white text-gray-400 hover:border-green-400 hover:text-green-600"
                  }`}
                  title="Present"
                >
                  ✓
                </button>
                <button
                  onClick={() => toggle(p.id, false)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
                    status === false
                      ? "bg-red-500 text-white shadow"
                      : "border border-gray-300 bg-white text-gray-400 hover:border-red-400 hover:text-red-600"
                  }`}
                  title="Absent"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {saved && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
          Attendance saved successfully.
        </div>
      )}
    </div>
  );
}
