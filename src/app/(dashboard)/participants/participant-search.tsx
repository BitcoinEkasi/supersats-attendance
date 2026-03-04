"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ParticipantSearch({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    router.push(`/participants${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search participants..."
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        Search
      </button>
      {search && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.push("/participants");
          }}
          className="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
        >
          Clear
        </button>
      )}
    </form>
  );
}
