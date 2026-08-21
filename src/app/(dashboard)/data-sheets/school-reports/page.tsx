import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SchoolReportsTable from "./school-reports-table";

export default async function SchoolReportsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
    select: {
      id: true, tskId: true, surname: true, fullNames: true, knownAs: true, tskStatus: true,
      dateOfBirth: true, gender: true,
      schoolReports: {
        select: {
          year: true,
          term1Result: true, term1FileUrl: true,
          term2Result: true, term2FileUrl: true,
          term3Result: true, term3FileUrl: true,
          term4Result: true, term4FileUrl: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">School Reports</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spreadsheet-style view of the active roster — filter, hand-pick participants, and export.
        </p>
      </div>
      <SchoolReportsTable participants={participants} />
    </div>
  );
}
