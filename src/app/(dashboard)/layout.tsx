import SessionProvider from "@/components/session-provider";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import MobileHeader from "@/components/mobile-header";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import MidnightReset from "@/components/midnight-reset";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

const DemoBanner = () => (
  <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-medium text-amber-900">
    <span>⚡</span>
    <span>SuperSats demo — data resets every 2 hours</span>
    <span>·</span>
    <a href="https://supersats.co" className="underline hover:no-underline">supersats.co</a>
  </div>
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role as UserRole | undefined;
  const isDemo = !!process.env.DEMO_MODE;

  if (role === "MARSHAL") {
    return (
      <SessionProvider>
        <MidnightReset />
        <div className="flex h-dvh flex-col bg-white">
          {isDemo && <DemoBanner />}
          <MobileHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <div className="flex h-screen flex-col">
        {isDemo && <DemoBanner />}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar role={role} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
