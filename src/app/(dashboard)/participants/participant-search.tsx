"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function ParticipantSearch({
  initialSearch,
  tab,
}: {
  initialSearch: string;
  tab: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (tab && tab !== "active") params.set("tab", tab);
      if (search) params.set("search", search);
      const qs = params.toString();
      router.push(`/participants${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, tab, router]);

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search participants..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
