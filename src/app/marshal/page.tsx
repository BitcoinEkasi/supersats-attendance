"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";

const GROUP_COLORS: Record<string, string> = {
  TURTLES:     "border-teal-400 bg-teal-50 text-teal-800 active:bg-teal-100",
  SEALS:       "border-cyan-400 bg-cyan-50 text-cyan-800 active:bg-cyan-100",
  DOLPHINS:    "border-blue-400 bg-blue-50 text-blue-800 active:bg-blue-100",
  SHARKS:      "border-purple-400 bg-purple-50 text-purple-800 active:bg-purple-100",
  FREE_SURFERS: "border-orange-400 bg-orange-50 text-orange-800 active:bg-orange-100",
};

export default function MarshalLoginPage() {
  const router = useRouter();
  const [group, setGroup] = useState<TskGroupKey | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!group || !passcode) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username: group,
      password: passcode,
      redirect: false,
    });
    if (result?.error) {
      setError("Incorrect passcode");
      setPasscode("");
      setLoading(false);
    } else {
      router.push("/attendance");
    }
  }

  if (!group) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Marshal Login</h1>
        <p className="mt-1 text-sm text-gray-500">Select your group</p>
        <div className="mt-8 w-full max-w-sm space-y-3">
          {TSK_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`w-full rounded-2xl border-2 px-6 py-5 text-left text-lg font-semibold transition-all ${GROUP_COLORS[g]}`}
            >
              {TSK_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <button
        onClick={() => { setGroup(null); setPasscode(""); setError(""); }}
        className="mb-2 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900">{TSK_GROUP_LABELS[group]}</h1>
      <p className="mt-1 text-sm text-gray-500">Enter your passcode</p>

      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={loading}
        autoFocus
        className="mt-8 w-64 rounded-2xl border border-gray-300 bg-white px-5 py-4 text-center text-xl tracking-widest shadow-sm focus:border-orange-400 focus:outline-none disabled:opacity-50"
        placeholder="••••••••"
      />

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || passcode.length === 0}
        className="mt-6 w-64 rounded-2xl bg-orange-600 py-4 text-lg font-bold text-white disabled:opacity-40 active:bg-orange-700"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </div>
  );
}
