"use client";

import { signOut, useSession } from "next-auth/react";

const roleLabels: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  MARSHAL: "Marshal",
};

const roleColors: Record<string, string> = {
  ADMINISTRATOR: "bg-orange-100 text-orange-700",
  MARSHAL: "bg-blue-100 text-blue-700",
};

export default function Header() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{session?.user?.email}</span>
        {role && (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              roleColors[role] || "bg-gray-100 text-gray-600"
            }`}
          >
            {roleLabels[role] || role}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
