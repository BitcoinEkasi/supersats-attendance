import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { POD_LEVEL, FREE_SURFER_LEVEL } from "@/lib/tsk-levels";
import type { ParticipantStatus, PaymentMethod } from "@prisma/client";

function currentMonthStr() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { event: { select: { date: true, category: true } } },
      },
      changeRequests: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!participant) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(participant);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Notes-only update
  if ("notes" in body && Object.keys(body).length === 1) {
    await prisma.participant.update({ where: { id }, data: { notes: body.notes?.trim() || null } });
    return Response.json({ success: true });
  }

  // Status-only update (legacy path — full form update now handles status too)
  if (body.status && Object.keys(body).filter((k) => !["status", "retiredReason", "retiredReasonOther"].includes(k)).length === 0) {
    try {
      const data: Record<string, unknown> = { status: body.status as ParticipantStatus };
      if (body.status === "RETIRED") {
        data.retiredAt = new Date();
        data.retiredReason = body.retiredReason?.trim() || null;
        data.retiredReasonOther = body.retiredReason === "Other" ? (body.retiredReasonOther?.trim() || null) : null;
      }
      if (body.status === "ACTIVE") { data.retiredAt = null; data.retiredReason = null; data.retiredReasonOther = null; }
      await prisma.participant.update({ where: { id }, data });
      if (body.status === "RETIRED") await upsertMonthlyReport(currentMonthStr(), user.id);
      return Response.json({ success: true });
    } catch {
      return Response.json({ error: "Failed to update status" }, { status: 500 });
    }
  }

  const surname = body.surname?.trim();
  const fullNames = body.fullNames?.trim();
  const idNumber = body.idNumber?.trim();

  if (!surname || !fullNames || !idNumber) {
    return Response.json({ error: "Surname, full names, and ID number are required" }, { status: 400 });
  }

  const parsed = parseSaId(idNumber);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const newTskStatus = body.tskStatus?.trim() || null;
  const existing = await prisma.participant.findUnique({
    where: { id },
    select: { tskStatus: true, weightKg: true, heightCm: true, tshirtSize: true, shoeSize: true, wetsuiteSize: true, isJuniorCoach: true, juniorCoachLevel: true },
  });
  const tskStatusChanged = existing && existing.tskStatus !== newTskStatus;

  const newIsJuniorCoach = body.isJuniorCoach === "on" || body.isJuniorCoach === true;
  const newJcLevel = (newIsJuniorCoach && body.juniorCoachLevel) ? parseInt(body.juniorCoachLevel) || null : null;
  const existingJc = existing?.isJuniorCoach ?? false;
  const existingJcLevel = existing?.juniorCoachLevel ?? null;

  // Enforce forward-only JC level progression
  if (existingJc && newIsJuniorCoach && existingJcLevel && newJcLevel && newJcLevel < existingJcLevel) {
    return Response.json({ error: "Junior Coach level cannot be reduced. Untick to remove Junior Coach status." }, { status: 400 });
  }

  const now = new Date();
  const newWeightKg = body.weightKg ? parseFloat(body.weightKg) || null : null;
  const newHeightCm = body.heightCm ? parseFloat(body.heightCm) || null : null;
  const newTshirtSize = body.tshirtSize?.trim() || null;
  const newShoeSize = body.shoeSize?.trim() || null;
  const newWetsuiteSize = body.wetsuiteSize?.trim() || null;
  const weightChanged    = existing && existing.weightKg !== newWeightKg;
  const heightChanged    = existing && existing.heightCm !== newHeightCm;
  const tshirtChanged    = existing && existing.tshirtSize !== newTshirtSize;
  const shoeChanged      = existing && existing.shoeSize !== newShoeSize;
  const wetsuiteChanged  = existing && existing.wetsuiteSize !== newWetsuiteSize;
  const measurementsChanged = weightChanged || heightChanged || tshirtChanged || shoeChanged || wetsuiteChanged;

  try {
    await prisma.participant.update({
      where: { id },
      data: {
        surname,
        fullNames,
        knownAs: body.knownAs?.trim() || null,
        idNumber,
        gender: parsed.gender,
        dateOfBirth: parsed.dob,
        status: body.status as ParticipantStatus,
        ...(body.status === "RETIRED" ? {
          retiredAt: new Date(),
          retiredReason: body.retiredReason?.trim() || null,
          retiredReasonOther: body.retiredReason === "Other" ? (body.retiredReasonOther?.trim() || null) : null,
        } : {}),
        ...(body.status === "ACTIVE" ? { retiredAt: null, retiredReason: null, retiredReasonOther: null } : {}),
        isJuniorCoach: body.isJuniorCoach === "on" || body.isJuniorCoach === true,
        juniorCoachLevel: (body.isJuniorCoach === "on" || body.isJuniorCoach === true) && body.juniorCoachLevel
          ? parseInt(body.juniorCoachLevel) || null
          : null,
        ethnicity: body.ethnicity?.trim() || null,
        language: body.language?.trim() || null,
        school: body.school?.trim() || null,
        grade: body.grade?.trim() || null,
        guardian: body.guardian?.trim() || null,
        guardianId: body.guardianId?.trim() || null,
        guardianRelationship: body.guardianRelationship?.trim() || null,
        address: body.address?.trim() || null,
        contact1: body.contact1?.trim() || null,
        contact2: body.contact2?.trim() || null,
        housingType: body.housingType?.trim() || null,
        idDocumentUrl: body.idDocumentUrl?.trim() || null,
        idDocumentUploadedAt: body.idDocumentUploadedAt ? new Date(body.idDocumentUploadedAt) : null,
        indemnityFormUrl: body.indemnityFormUrl?.trim() || null,
        indemnityUploadedAt: body.indemnityUploadedAt ? new Date(body.indemnityUploadedAt) : null,
        tskStatus: newTskStatus,
        ...(tskStatusChanged ? { tskStatusUpdatedAt: new Date() } : {}),
        weightKg: newWeightKg,
        ...(weightChanged   ? { weightUpdatedAt: now }    : {}),
        heightCm: newHeightCm,
        ...(heightChanged   ? { heightUpdatedAt: now }    : {}),
        tshirtSize: newTshirtSize,
        ...(tshirtChanged   ? { tshirtSizeUpdatedAt: now } : {}),
        shoeSize: newShoeSize,
        ...(shoeChanged     ? { shoeSizeUpdatedAt: now }  : {}),
        wetsuiteSize: newWetsuiteSize,
        ...(wetsuiteChanged ? { wetsuiteUpdatedAt: now }  : {}),
        ...(measurementsChanged ? { measurementsUpdatedAt: now } : {}),
        notes: body.notes?.trim() || null,
        paymentMethod: (body.paymentMethod as PaymentMethod) ?? "BOLT_CARD",
        lightningAddress: body.lightningAddress?.trim() || null,
        ...(body.registrationDate ? { registrationDate: new Date(body.registrationDate + "T00:00:00Z") } : {}),
        ...(body.profilePicture !== undefined ? { profilePicture: body.profilePicture || null } : {}),
      },
    });
    if (tskStatusChanged && newTskStatus) {
      await prisma.tskLevelHistory.create({
        data: { participantId: id, level: newTskStatus, changedAt: new Date() },
      });
    }

    // Handle JC history tracking
    const jcStarted = !existingJc && newIsJuniorCoach && newJcLevel;
    const jcEnded = existingJc && !newIsJuniorCoach;
    const jcLevelChanged = existingJc && newIsJuniorCoach && newJcLevel && existingJcLevel !== newJcLevel;

    if (jcEnded || jcLevelChanged) {
      const openEntry = await prisma.juniorCoachHistory.findFirst({
        where: { participantId: id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (openEntry) {
        let endReason = "manual";
        if (newTskStatus === POD_LEVEL) endReason = "shark_elite";
        else if (newTskStatus === FREE_SURFER_LEVEL) endReason = "free_surfer";
        else if (jcLevelChanged) endReason = "promoted";
        await prisma.juniorCoachHistory.update({
          where: { id: openEntry.id },
          data: { endedAt: now, endReason },
        });
      }
    }
    if (jcStarted || jcLevelChanged) {
      await prisma.juniorCoachHistory.create({
        data: { participantId: id, level: newJcLevel!, startedAt: now },
      });
    }

    if (body.status === "RETIRED") await upsertMonthlyReport(currentMonthStr(), user.id);

    return Response.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A participant with this ID number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update participant" }, { status: 500 });
  }
}
