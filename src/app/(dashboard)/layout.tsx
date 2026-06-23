import SessionProvider from "@/components/session-provider";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import MobileHeader from "@/components/mobile-header";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import MidnightReset from "@/components/midnight-reset";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role as UserRole | undefined;

  if (role === "MARSHAL") {
    return (
      <SessionProvider>
        <MidnightReset />
        <div className="flex h-dvh flex-col bg-white">
          <MobileHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <div className="flex h-screen">
        <Sidebar role={role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
