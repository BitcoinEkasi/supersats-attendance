import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BackupRestore from "./backup-restore";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Settings</h2>
      <BackupRestore />
    </div>
  );
}
