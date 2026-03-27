"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/role-guard";
import type { EventCategory } from "@prisma/client";

export async function createEvent(formData: FormData) {
  const user = await requireRole(["ADMINISTRATOR", "MARSHALL"]);

  const date = formData.get("date") as string;
  const category = formData.get("category") as EventCategory;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!date || !category) {
    return { error: "Date and category are required" };
  }

  try {
    const event = await prisma.event.create({
      data: {
        date: new Date(date + "T00:00:00Z"),
        category,
        note,
        createdBy: user.id,
      },
    });
    revalidatePath("/attendance");
    return { success: true, id: event.id };
  } catch {
    return { error: "Failed to create event" };
  }
}

export async function getEvents(month?: string) {
  const where = month
    ? {
        date: {
          gte: new Date(`${month}-01T00:00:00Z`),
          lte: new Date(
            new Date(`${month}-01T00:00:00Z`).getFullYear(),
            new Date(`${month}-01T00:00:00Z`).getMonth() + 1,
            0,
          ),
        },
      }
    : {};

  return prisma.event.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      _count: { select: { attendanceRecords: true } },
      creator: { select: { name: true } },
    },
  });
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        include: {
          participant: {
            select: { id: true, surname: true, fullNames: true, knownAs: true },
          },
        },
      },
      creator: { select: { name: true } },
    },
  });
}

export async function saveAttendance(
  eventId: string,
  records: { participantId: string; present: boolean }[],
) {
  await requireRole(["ADMINISTRATOR", "MARSHALL"]);

  try {
    await prisma.$transaction(
      records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: {
            participantId_eventId: {
              participantId: r.participantId,
              eventId,
            },
          },
          update: { present: r.present },
          create: {
            participantId: r.participantId,
            eventId,
            present: r.present,
          },
        }),
      ),
    );

    revalidatePath(`/attendance/${eventId}`);
    revalidatePath("/attendance");
    return { success: true };
  } catch {
    return { error: "Failed to save attendance" };
  }
}
