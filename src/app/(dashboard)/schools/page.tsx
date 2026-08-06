import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SchoolsForm from "./schools-form";

export default async function SchoolsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">School Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage the schools participants can be linked to, and keep principal/secretary contact details on hand for staff.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <SchoolsForm schools={schools} />
      </div>
    </div>
  );
}
