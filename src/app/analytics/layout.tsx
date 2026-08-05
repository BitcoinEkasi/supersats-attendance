import type { Metadata } from "next";
import RotateHint from "./rotate-hint";
import InstallBanner from "./install-banner";
import OrientationLock from "./orientation-lock";

export const metadata: Metadata = {
  title: "TSK Attendance Charts (Public View)",
  manifest: "/analytics-manifest.json",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.register('/analytics-sw.js').catch(function(){});` }} />
      <OrientationLock />
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">TSK Attendance Charts (Public View)</h1>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <RotateHint />
          {children}
        </main>
      </div>
      <InstallBanner />
    </>
  );
}
