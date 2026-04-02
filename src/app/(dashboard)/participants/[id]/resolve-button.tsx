"use client";

import { useRouter } from "next/navigation";

export default function ResolveButton({ requestId }: { requestId: string }) {
  const router = useRouter();

  async function handleResolve() {
    await fetch(`/api/change-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleResolve}
      className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
    >
      Mark Resolved
    </button>
  );
}
