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

  function appendDigit(d: string) {
    if (passcode.length < 8) setPasscode((p) => p + d);
  }

  function deleteDigit() {
    setPasscode((p) => p.slice(0, -1));
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Marshall Login</h1>
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

  const dots = Array.from({ length: 8 }, (_, i) => i < passcode.length);

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

      {/* Passcode dots */}
      <div className="mt-8 flex gap-3">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all ${filled ? "border-orange-500 bg-orange-500" : "border-gray-300 bg-white"}`}
          />
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}

      {/* Numeric keypad */}
      <div className="mt-8 grid grid-cols-3 gap-3 w-64">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            onClick={() => appendDigit(d)}
            disabled={loading}
            className="rounded-2xl border border-gray-200 bg-white py-5 text-xl font-semibold text-gray-800 shadow-sm active:bg-gray-100 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <div /> {/* spacer */}
        <button
          onClick={() => appendDigit("0")}
          disabled={loading}
          className="rounded-2xl border border-gray-200 bg-white py-5 text-xl font-semibold text-gray-800 shadow-sm active:bg-gray-100 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={deleteDigit}
          disabled={loading}
          className="rounded-2xl border border-gray-200 bg-white py-5 text-xl font-semibold text-gray-400 shadow-sm active:bg-gray-100 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

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
