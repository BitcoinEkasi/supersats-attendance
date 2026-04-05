"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PerformanceEvent } from "@prisma/client";

interface Props {
  participantId: string;
  events: PerformanceEvent[];
}

export default function PerformanceEventsSection({ participantId, events }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [division, setDivision] = useState("");
  const [result, setResult] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!eventDate || !eventName.trim() || !result.trim()) {
      setError("Event date, event name, and result are required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/participants/${participantId}/performance-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDate,
        eventName: eventName.trim(),
        location: location.trim() || null,
        division: division || null,
        result: result.trim(),
        verifyUrl: verifyUrl.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setEventDate(""); setEventName(""); setLocation(""); setDivision(""); setResult(""); setVerifyUrl("");
      setAdding(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/participants/${participantId}/performance-events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none";

  return (
    <div className="space-y-3">
      {events.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No competitive events recorded yet.</p>
      )}

      {events.map((ev) => (
        <div key={ev.id} className="flex items-start justify-between rounded-md border border-gray-200 px-3 py-2">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-gray-700">{ev.eventName}</p>
            <p className="text-xs text-gray-500">{ev.result}</p>
            <p className="text-xs text-gray-400">
              {new Date(ev.eventDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {ev.location && <span> · {ev.location}</span>}
              {ev.division && <span> · {ev.division}</span>}
            </p>
            {ev.verifyUrl && (
              <a href={ev.verifyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                Verify result
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(ev.id)}
            className="ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            aria-label="Delete event"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}

      {adding && (
        <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Event Name *</label>
              <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. SA Surf Champs" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Event Date *</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Muizenberg Beach" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Division</label>
              <select value={division} onChange={(e) => setDivision(e.target.value)} className={inputCls}>
                <option value="">— select —</option>
                <option>U/8</option><option>U/10</option><option>U/12</option>
                <option>U/14</option><option>U/16</option><option>U/18</option><option>Open</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Result *</label>
              <input type="text" value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. 1st place" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Verify Link</label>
            <input type="url" value={verifyUrl} onChange={(e) => setVerifyUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Event"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(""); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600">
          + Add Event
        </button>
      )}
    </div>
  );
}
