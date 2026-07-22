"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Slot = "ZERO_ATTENDANCE_WEEKDAY" | "ZERO_ATTENDANCE_SATURDAY" | "TSK_PULSE_WEEKDAY" | "TSK_PULSE_SATURDAY";
type Schedule = { slot: Slot; hour: number; minute: number };

function toTimeStr(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const SLOT_GROUPS: { title: string; weekday: Slot; saturday: Slot }[] = [
  { title: "Zero Attendance", weekday: "ZERO_ATTENDANCE_WEEKDAY", saturday: "ZERO_ATTENDANCE_SATURDAY" },
  { title: "TSK Pulse", weekday: "TSK_PULSE_WEEKDAY", saturday: "TSK_PULSE_SATURDAY" },
];

export default function EmailScheduleForm({ schedules }: { schedules: Schedule[] }) {
  const router = useRouter();
  const initial = Object.fromEntries(schedules.map((s) => [s.slot, toTimeStr(s.hour, s.minute)])) as Record<Slot, string>;
  const [times, setTimes] = useState<Record<Slot, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    for (const slot of Object.keys(times) as Slot[]) {
      const [hour, minute] = times[slot].split(":").map(Number);
      const res = await fetch("/api/admin/email-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, hour, minute }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSaving(false);
        return;
      }
    }
    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {saved && <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">Schedule updated — may take up to ~15 minutes to take effect.</div>}

      {SLOT_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.title}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tue-Fri</label>
              <input
                type="time"
                value={times[group.weekday]}
                onChange={(e) => { setTimes({ ...times, [group.weekday]: e.target.value }); setSaved(false); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Saturday</label>
              <input
                type="time"
                value={times[group.saturday]}
                onChange={(e) => { setTimes({ ...times, [group.saturday]: e.target.value }); setSaved(false); }}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Schedule"}
      </button>
    </div>
  );
}
