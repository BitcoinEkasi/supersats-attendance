import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SessionActivitiesForm from "./session-activities-form";

export default async function SessionActivitiesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const activities = await prisma.sessionActivity.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Session Activities</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage the activities marshals can select when starting a session. Changes only affect new sessions going forward — past sessions keep the activity they were created with.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <SessionActivitiesForm activities={activities} />
      </div>
    </div>
  );
}
