import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import type { PaymentMethod } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const validMethods: PaymentMethod[] = ["BOLT_CARD", "LIGHTNING_ADDRESS"];
  const paymentMethod = body.paymentMethod as PaymentMethod;
  if (!validMethods.includes(paymentMethod)) {
    return Response.json({ error: "Invalid payment method" }, { status: 400 });
  }

  if (paymentMethod === "LIGHTNING_ADDRESS" && !body.lightningAddress?.trim()) {
    return Response.json({ error: "Lightning address is required" }, { status: 400 });
  }

  await prisma.participant.update({
    where: { id },
    data: {
      paymentMethod,
      lightningAddress: paymentMethod === "LIGHTNING_ADDRESS" ? body.lightningAddress.trim() : null,
    },
  });

  return Response.json({ success: true });
}
