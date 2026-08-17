import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BodyMeasurementsTable from "./body-measurements-table";

export default async function DataSheetsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
    select: {
      id: true, tskId: true, surname: true, fullNames: true, knownAs: true, tskStatus: true,
      weightKg: true, heightCm: true, tshirtSize: true, shoeSize: true, wetsuiteSize: true,
      measurementsUpdatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Consolidated Data Sheets</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spreadsheet-style views of the active roster — filter, hand-pick participants, and export.
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Body Measurements</h3>
        <div className="mt-3">
          <BodyMeasurementsTable participants={participants} />
        </div>
      </div>
    </div>
  );
}
