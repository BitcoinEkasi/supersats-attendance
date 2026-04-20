"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEV_ACCOUNTS = [
  { label: "Administrator", username: "admin",   password: "admin123",    color: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200" },
  { label: "Marshal",      username: "marshal", password: "marshal123", color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" },
];

const isDev = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      const result = await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        setLoading(false);
      } else {
        router.push("/");
      }
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function devLogin(username: string, password: string, label: string) {
    setDevLoading(label);
    setError("");
    const result = await signIn("credentials", { username, password, redirect: false });
    if (result?.error) {
      setError("Dev login failed");
      setDevLoading(null);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">TSK Participation & Performance</h1>
          <p className="mt-1 text-sm text-gray-500">Participation & Performance Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/marshal" className="text-sm text-orange-600 hover:underline">
            Marshal? Sign in here →
          </a>
        </div>

        {isDev && (
          <div className="mt-6">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-3 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                DEV SWITCH
              </span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEV_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  onClick={() => devLogin(account.username, account.password, account.label)}
                  disabled={!!devLoading}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${account.color}`}
                >
                  {devLoading === account.label ? "..." : account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
