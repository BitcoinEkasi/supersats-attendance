import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import type { EmailScheduleSlot } from "@prisma/client";

const VALID_SLOTS: EmailScheduleSlot[] = [
  "ZERO_ATTENDANCE_WEEKDAY",
  "ZERO_ATTENDANCE_SATURDAY",
  "TSK_PULSE_WEEKDAY",
  "TSK_PULSE_SATURDAY",
];

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.emailSchedule.findMany();
  return Response.json(schedules);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const slot = body.slot as EmailScheduleSlot;
  const hour = parseInt(body.hour);
  const minute = parseInt(body.minute);

  if (!VALID_SLOTS.includes(slot)) {
    return Response.json({ error: "Invalid slot" }, { status: 400 });
  }
  if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
    return Response.json({ error: "hour must be 0-23 and minute must be 0-59" }, { status: 400 });
  }

  const schedule = await prisma.emailSchedule.upsert({
    where: { slot },
    create: { slot, hour, minute, updatedBy: user.name ?? user.id },
    update: { hour, minute, updatedBy: user.name ?? user.id },
  });

  return Response.json({ success: true, schedule });
}
