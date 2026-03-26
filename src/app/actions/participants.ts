"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseSaId } from "@/lib/sa-id";
import { getNextTskId } from "@/lib/tsk-id";
import { requireRole } from "@/lib/role-guard";
import type { ParticipantStatus } from "@prisma/client";

export async function getParticipants(search?: string) {
  const where = search
    ? {
        OR: [
          { tskId: { contains: search, mode: "insensitive" as const } },
          { surname: { contains: search, mode: "insensitive" as const } },
          { fullNames: { contains: search, mode: "insensitive" as const } },
          { knownAs: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return prisma.participant.findMany({
    where,
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });
}

export async function getParticipant(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          event: {
            select: { date: true, category: true },
          },
        },
      },
      changeRequests: {
        where: { status: "pending" },
        include: {
          requestedByUser: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createParticipant(formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const surname = (formData.get("surname") as string)?.trim();
  const fullNames = (formData.get("fullNames") as string)?.trim();
  const knownAs = (formData.get("knownAs") as string)?.trim() || null;
  const idNumber = (formData.get("idNumber") as string)?.trim();
  const boltCardUrl = (formData.get("boltCardUrl") as string)?.trim() || null;
  const status = (formData.get("status") as ParticipantStatus) || "ACTIVE";
  const profilePicture = (formData.get("profilePicture") as string) || null;

  if (!surname || !fullNames || !idNumber) {
    return { error: "Surname, full names, and ID number are required" };
  }

  const parsed = parseSaId(idNumber);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const participant = await prisma.$transaction(async (tx) => {
      const tskId = await getNextTskId(tx);
      return tx.participant.create({
        data: {
          tskId,
          surname,
          fullNames,
          knownAs,
          idNumber,
          gender: parsed.gender,
          dateOfBirth: parsed.dob,
          boltCardUrl,
          status,
          profilePicture,
        },
      });
    });

    revalidatePath("/participants");
    return { success: true, id: participant.id, tskId: participant.tskId };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { error: "A participant with this ID number already exists" };
    }
    return { error: "Failed to create participant" };
  }
}

export async function updateParticipant(id: string, formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const surname = (formData.get("surname") as string)?.trim();
  const fullNames = (formData.get("fullNames") as string)?.trim();
  const knownAs = (formData.get("knownAs") as string)?.trim() || null;
  const idNumber = (formData.get("idNumber") as string)?.trim();
  const boltCardUrl = (formData.get("boltCardUrl") as string)?.trim() || null;
  const status = formData.get("status") as ParticipantStatus;
  const profilePicture = (formData.get("profilePicture") as string) || null;

  if (!surname || !fullNames || !idNumber) {
    return { error: "Surname, full names, and ID number are required" };
  }

  const parsed = parseSaId(idNumber);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    await prisma.participant.update({
      where: { id },
      data: {
        surname,
        fullNames,
        knownAs,
        idNumber,
        gender: parsed.gender,
        dateOfBirth: parsed.dob,
        boltCardUrl,
        status,
        ...(profilePicture ? { profilePicture } : {}),
      },
    });
    revalidatePath("/participants");
    revalidatePath(`/participants/${id}`);
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { error: "A participant with this ID number already exists" };
    }
    return { error: "Failed to update participant" };
  }
}

export async function updateParticipantStatus(id: string, status: ParticipantStatus) {
  await requireRole(["ADMINISTRATOR"]);

  try {
    await prisma.participant.update({ where: { id }, data: { status } });
    revalidatePath("/participants");
    revalidatePath(`/participants/${id}`);
    return { success: true };
  } catch {
    return { error: "Failed to update status" };
  }
}

export async function submitChangeRequest(participantId: string, notes: string) {
  const user = await requireRole(["GATEKEEPER", "ADMINISTRATOR"]);

  if (!notes.trim()) {
    return { error: "Please describe the requested change" };
  }

  try {
    await prisma.participantChangeRequest.create({
      data: {
        participantId: participantId || null,
        requestedBy: user.id,
        notes: notes.trim(),
      },
    });
    revalidatePath(`/participants/${participantId}`);
    return { success: true };
  } catch {
    return { error: "Failed to submit change request" };
  }
}

export async function resolveChangeRequest(requestId: string) {
  await requireRole(["ADMINISTRATOR"]);

  try {
    await prisma.participantChangeRequest.update({
      where: { id: requestId },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    revalidatePath("/participants");
    return { success: true };
  } catch {
    return { error: "Failed to resolve change request" };
  }
}

export async function getPendingChangeRequestCount() {
  return prisma.participantChangeRequest.count({
    where: { status: "pending" },
  });
}
