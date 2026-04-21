"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { getDivisionLabel } from "@/lib/sa-id";

type Participant = {
  id: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
  profilePicture: string | null;
  dateOfBirth: Date;
  gender: "MALE" | "FEMALE";
  isJuniorCoach: boolean;
  juniorCoachLevel: number | null;
  tskStatus: string | null;
};

type ExistingRecord = {
  participantId: string;
  present: boolean;
};

type Mark = "present" | null;

const AUTOSAVE_DEBOUNCE_MS = 800;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="4,13 9,18 20,7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
    </svg>
  );
}

export default function AttendanceCapture({
  eventId,
  participants,
  existing,
  mobile = false,
}: {
  eventId: string;
  participants: Participant[];
  existing: ExistingRecord[];
  mobile?: boolean;
}) {
  const initialState = new Map<string, Mark>();
  for (const p of participants) initialState.set(p.id, null);
  for (const r of existing) {
    if (r.present) initialState.set(r.participantId, "present");
  }

  const [marks, setMarks] = useState<Map<string, Mark>>(new Map(initialState));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    setSaveStatus("saving");
    autosaveRef.current = setTimeout(async () => {
      const records = [...marks.entries()].map(([participantId, v]) => ({
        participantId,
        present: v === "present",
        onTour: false,
      }));
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });
      const result = await res.json();
      if (result.error) {
        setError(result.error);
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [marks]);

  function displayName(p: Participant) {
    return p.knownAs ?? `${p.surname}, ${p.fullNames}`;
  }

  function handleTap(id: string) {
    setMarks((prev) => {
      const next = new Map(prev);
      next.set(id, prev.get(id) === "present" ? null : "present");
      return next;
    });
  }

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...participants]
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
      .filter((p) => !q || `${p.surname} ${p.fullNames} ${p.knownAs || ""}`.toLowerCase().includes(q));
  }, [participants, search]);

  const presentCount = [...marks.values()].filter((v) => v === "present").length;
  const total = participants.length;

  const statusIndicator = (
    <span className="text-xs text-gray-400">
      {saveStatus === "saving" && "Saving…"}
      {saveStatus === "saved" && "✓ Saved"}
      {saveStatus === "error" && <span className="text-red-500">Save failed</span>}
    </span>
  );

  const searchBar = (mobile: boolean) => (
    <div className="relative">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className={`w-full border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm focus:border-orange-400 focus:outline-none ${mobile ? "rounded-xl" : "rounded-lg"}`}
      />
      {search && (
        <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );

  const participantRow = (p: Participant, mobile: boolean) => {
    const mark = marks.get(p.id);
    const isPresent = mark === "present";
    return (
      <div key={p.id} className={`flex items-center gap-3 bg-white ${mobile ? "px-4 py-3" : "px-4 py-3"}`}>
        <div className={`shrink-0 h-10 w-10 rounded-full overflow-hidden ring-2 ${p.gender === "FEMALE" ? "ring-pink-500" : "ring-blue-500"}`}>
          {p.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profilePicture} alt={displayName(p)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-orange-100 text-sm font-bold text-orange-600">
              {displayName(p).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900">{p.surname}, {p.fullNames}</p>
          <p className="truncate text-xs text-gray-500">
            {p.knownAs && <span className="mr-1">({p.knownAs})</span>}
            {getDivisionLabel(p.dateOfBirth, p.gender)}
            {p.tskStatus && <span className="ml-1">· {p.tskStatus}</span>}
            {p.isJuniorCoach && <span className="ml-1 text-blue-400">· JC{p.juniorCoachLevel != null ? ` ${p.juniorCoachLevel}` : ""}</span>}
          </p>
        </div>
        <button
          onClick={() => handleTap(p.id)}
          className={`flex shrink-0 items-center justify-center rounded-xl transition-colors ${mobile ? "h-14 w-14 active:scale-95" : "h-12 w-12"} ${
            isPresent ? "bg-green-500 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-300"
          }`}
        >
          {isPresent ? <CheckIcon /> : <XIcon />}
        </button>
      </div>
    );
  };

  if (mobile) {
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-3 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Listed: <span className="font-semibold text-gray-900">{total}</span></span>
              <span>Present: <span className="font-semibold text-green-600">{presentCount}</span></span>
            </div>
            {statusIndicator}
          </div>
          {searchBar(true)}
        </div>
        {error && <div className="mx-4 mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <div className="divide-y divide-gray-100">{sorted.map((p) => participantRow(p, true))}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Listed: <span className="font-semibold text-gray-900">{total}</span></span>
            <span>Present: <span className="font-semibold text-green-600">{presentCount}</span></span>
          </div>
          {statusIndicator}
        </div>
        {searchBar(false)}
      </div>
      {error && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
        {sorted.map((p) => participantRow(p, false))}
      </div>
    </div>
  );
}
