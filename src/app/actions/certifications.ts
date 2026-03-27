"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/role-guard";
import { randomUUID } from "crypto";
import type { CertificationType } from "@prisma/client";

export async function uploadCertification(participantId: string, type: CertificationType, fileUrl: string) {
  await requireRole(["ADMINISTRATOR"]);

  await prisma.certification.upsert({
    where: {
      // Use a composite-style upsert via findFirst + create/update
      id: (await prisma.certification.findFirst({ where: { participantId, type } }))?.id ?? randomUUID(),
    },
    update: { fileUrl, uploadedAt: new Date() },
    create: { id: randomUUID(), participantId, type, fileUrl },
  });

  revalidatePath(`/participants/${participantId}`);
  return { success: true };
}

export async function deleteCertification(id: string, participantId: string) {
  await requireRole(["ADMINISTRATOR"]);
  await prisma.certification.delete({ where: { id } });
  revalidatePath(`/participants/${participantId}`);
  return { success: true };
}
