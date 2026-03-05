"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseParticipantsCSV } from "@/lib/csv-parser";

export async function previewParticipantImport(csvText: string) {
  const { participants, warnings } = parseParticipantsCSV(csvText);

  const existing = await prisma.participant.findMany({ select: { csvName: true } });
  const existingNames = new Set(existing.map((p) => p.csvName));

  const toImport = participants.filter((p) => !existingNames.has(p.csvName));
  const duplicates = participants.filter((p) => existingNames.has(p.csvName));

  return { toImport, duplicates, warnings };
}

export async function commitParticipantImport(
  participants: { csvName: string; displayName: string }[],
) {
  if (participants.length === 0) return { added: 0 };

  const result = await prisma.participant.createMany({
    data: participants,
    skipDuplicates: true,
  });

  revalidatePath("/participants");
  return { added: result.count };
}

export async function getParticipants(search?: string) {
  const where = search
    ? {
        OR: [
          { csvName: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return prisma.participant.findMany({
    where,
    orderBy: { displayName: "asc" },
  });
}

export async function getParticipant(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        orderBy: { date: "desc" },
        take: 50,
      },
    },
  });
}

export async function createParticipant(formData: FormData) {
  const csvName = formData.get("csvName") as string;
  const displayName = formData.get("displayName") as string;
  const boltCardId = (formData.get("boltCardId") as string) || null;

  if (!csvName || !displayName) {
    return { error: "CSV name and display name are required" };
  }

  try {
    await prisma.participant.create({
      data: { csvName, displayName, boltCardId },
    });
    revalidatePath("/participants");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { error: "A participant with this CSV name already exists" };
    }
    return { error: "Failed to create participant" };
  }
}

export async function updateParticipant(id: string, formData: FormData) {
  const csvName = formData.get("csvName") as string;
  const displayName = formData.get("displayName") as string;
  const boltCardId = (formData.get("boltCardId") as string) || null;
  const isActive = formData.get("isActive") === "true";

  if (!csvName || !displayName) {
    return { error: "CSV name and display name are required" };
  }

  try {
    await prisma.participant.update({
      where: { id },
      data: { csvName, displayName, boltCardId, isActive },
    });
    revalidatePath("/participants");
    revalidatePath(`/participants/${id}`);
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { error: "A participant with this CSV name already exists" };
    }
    return { error: "Failed to update participant" };
  }
}

export async function deleteParticipant(id: string) {
  try {
    await prisma.participant.delete({ where: { id } });
    revalidatePath("/participants");
    return { success: true };
  } catch {
    return { error: "Failed to delete participant. They may have attendance records." };
  }
}
