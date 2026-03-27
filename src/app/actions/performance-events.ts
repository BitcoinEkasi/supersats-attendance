"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/role-guard";

export async function addPerformanceEvent(
  participantId: string,
  eventDate: string,
  eventName: string,
  location: string | null,
  division: string | null,
  result: string,
  verifyUrl: string | null
) {
  await requireRole(["ADMINISTRATOR"]);

  await prisma.performanceEvent.create({
    data: {
      participantId,
      eventDate: new Date(eventDate + "T00:00:00Z"),
      eventName,
      location: location || null,
      division: division || null,
      result,
      verifyUrl: verifyUrl || null,
    },
  });

  revalidatePath(`/participants/${participantId}`);
  return { success: true };
}

export async function deletePerformanceEvent(id: string, participantId: string) {
  await requireRole(["ADMINISTRATOR"]);

  await prisma.performanceEvent.delete({ where: { id } });
  revalidatePath(`/participants/${participantId}`);
  return { success: true };
}
