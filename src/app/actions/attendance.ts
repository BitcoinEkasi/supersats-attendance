"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/role-guard";
import { getSASTDateString, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { upsertMonthlyReport } from "@/app/actions/reports";
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
        date: new Date(date + "T00:00:00+02:00"),
        category,
        note,
        createdBy: user.id,
      },
    });
    revalidatePath("/attendance");
    const month = date.substring(0, 7);
    await upsertMonthlyReport(month, user.id);
    return { success: true, id: event.id };
  } catch {
    return { error: "Failed to create event" };
  }
}

export async function getEvents(month?: string) {
  const where = month
    ? {
        date: {
          gte: getStartOfSASTMonth(month),
          lte: getEndOfSASTMonth(month),
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
  records: { participantId: string; present: boolean; onTour?: boolean }[],
) {
  const user = await requireRole(["ADMINISTRATOR", "MARSHALL"]);

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
          update: { present: r.present, onTour: r.onTour ?? false },
          create: {
            participantId: r.participantId,
            eventId,
            present: r.present,
            onTour: r.onTour ?? false,
          },
        }),
      ),
    );

    revalidatePath(`/attendance/${eventId}`);
    revalidatePath("/attendance");

    // Auto-update the monthly report for this event's month
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { date: true } });
    if (event) {
      const sastDate = new Date(event.date.getTime() + 2 * 60 * 60 * 1000);
      const month = sastDate.toISOString().substring(0, 7);
      await upsertMonthlyReport(month, user.id);
    }

    return { success: true };
  } catch {
    return { error: "Failed to save attendance" };
  }
}

export async function updateEventNote(eventId: string, note: string | null) {
  await requireRole(["ADMINISTRATOR", "MARSHALL"]);
  try {
    await prisma.event.update({ where: { id: eventId }, data: { note: note || null } });
    revalidatePath(`/attendance/${eventId}`);
    return { success: true };
  } catch {
    return { error: "Failed to update note" };
  }
}

export async function updateEventCategory(eventId: string, category: EventCategory) {
  await requireRole(["ADMINISTRATOR", "MARSHALL"]);
  try {
    await prisma.event.update({ where: { id: eventId }, data: { category } });
    revalidatePath(`/attendance/${eventId}`);
    revalidatePath("/attendance");
    return { success: true };
  } catch {
    return { error: "Failed to update category" };
  }
}

export async function createEventForToday(category: EventCategory, note: string | null) {
  const user = await requireRole(["ADMINISTRATOR", "MARSHALL"]);
  const today = getSASTDateString();

  try {
    const event = await prisma.event.create({
      data: {
        date: new Date(today + "T00:00:00+02:00"),
        category,
        note,
        createdBy: user.id,
      },
    });
    revalidatePath("/attendance");
    const month = today.substring(0, 7);
    await upsertMonthlyReport(month, user.id);
    return { success: true, id: event.id };
  } catch {
    return { error: "Failed to create event" };
  }
}
