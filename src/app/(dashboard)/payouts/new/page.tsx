import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SpecialPayoutForm from "./special-payout-form";

export default async function NewSpecialPayoutPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      tskId: true,
      surname: true,
      fullNames: true,
      knownAs: true,
      boltUserId: true,
      paymentMethod: true,
      lightningAddress: true,
    },
    orderBy: { surname: "asc" },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Create Special Payout</h2>
      <p className="mt-1 text-sm text-gray-500">
        Set a default amount and note, apply to all, then adjust individual rows as needed.
      </p>
      <SpecialPayoutForm participants={participants as any} />
    </div>
  );
}
