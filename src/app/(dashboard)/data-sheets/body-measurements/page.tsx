import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BodyMeasurementsClient from "./body-measurements-client";

export default async function BodyMeasurementsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
    select: {
      id: true, tskId: true, surname: true, fullNames: true, knownAs: true, tskStatus: true,
      dateOfBirth: true, gender: true,
      weightKg: true, heightCm: true, tshirtSize: true, shoeSize: true, wetsuiteSize: true,
      measurementsUpdatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Body Measurements</h2>
        <p className="mt-1 text-sm text-gray-500">
          Spreadsheet-style view of the active roster — filter, hand-pick participants, and export.
        </p>
      </div>
      <BodyMeasurementsClient participants={participants} />
    </div>
  );
}
