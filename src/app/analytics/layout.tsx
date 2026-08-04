import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SUPERSATS Attendance — Public View",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-900">SUPERSATS Attendance — Public View</h1>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
