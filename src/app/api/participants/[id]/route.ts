import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { updateBoltUserDisplayName, updateBoltUserMeta } from "@/lib/bolt";
import { getDivisionLabel } from "@/lib/sa-id";
import { isAcEligible, TSK_LEVELS } from "@/lib/tsk-levels";
import { getGroupForStatus } from "@/lib/tsk-groups";
import { getSASTNow } from "@/lib/sast";
import { randomUUID } from "crypto";
import type { ParticipantStatus, PaymentMethod } from "@prisma/client";

function currentMonthStr() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isFirstOfMonth(): boolean {
  return getSASTNow().day === 1;
}

function nextMonthFirst(): Date {
  const { year, month } = getSASTNow();
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  return new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00.000Z`);
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

  // Status-only update (legacy path — full form update now handles status too)
  if (body.status && Object.keys(body).filter((k) => !["status", "retiredReason", "retiredReasonOther"].includes(k)).length === 0) {
    try {
      const current = await prisma.participant.findUnique({ where: { id }, select: { status: true } });
      if (!current) return Response.json({ error: "Not found" }, { status: 404 });
      if (current.status === "RETIRED" && body.status === "ACTIVE") {
        return Response.json({ error: "Retirement is permanent — add a new participant record instead." }, { status: 400 });
      }
      const data: Record<string, unknown> = { status: body.status as ParticipantStatus };
      if (body.status === "RETIRED" && current.status !== "RETIRED") {
        data.retiredAt = new Date();
        data.retiredReason = body.retiredReason?.trim() || null;
        data.retiredReasonOther = body.retiredReason === "Other" ? (body.retiredReasonOther?.trim() || null) : null;
      }
      if (body.status === "ACTIVE") { data.retiredAt = null; data.retiredReason = null; data.retiredReasonOther = null; }
      await prisma.participant.update({ where: { id }, data });
      if (body.status === "RETIRED") {
        await prisma.absenceFlag.deleteMany({ where: { participantId: id } });
        const p = await prisma.participant.findUnique({ where: { id }, select: { tskStatus: true } });
        const group = getGroupForStatus(p?.tskStatus ?? null);
        if (group) await upsertMonthlyReport(currentMonthStr(), user.id, group);
      }
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
  const validLevels = TSK_LEVELS.map((l) => l.value) as string[];
  if (!newTskStatus || !validLevels.includes(newTskStatus)) {
    return Response.json({ error: "A valid TSK level is required" }, { status: 400 });
  }

  const existing = await prisma.participant.findUnique({
    where: { id },
    select: { status: true, tskStatus: true, weightKg: true, heightCm: true, tshirtSize: true, shoeSize: true, wetsuiteSize: true, isAssistantCoach: true, assistantCoachSince: true, boltUserId: true, surname: true, fullNames: true, knownAs: true },
  });

  if (existing?.status === "RETIRED" && body.status === "ACTIVE") {
    return Response.json({ error: "Retirement is permanent — add a new participant record instead." }, { status: 400 });
  }

  const activeDuplicate = await prisma.participant.findFirst({
    where: { idNumber, status: "ACTIVE", id: { not: id } },
    select: { id: true },
  });
  if (activeDuplicate) {
    return Response.json({ error: "A participant with this ID number already exists" }, { status: 409 });
  }

  const tskStatusChanged = existing && existing.tskStatus !== newTskStatus;

  const now = new Date();
  const applyNow = isFirstOfMonth();
  const effectiveFrom = nextMonthFirst();

  // A retired participant is never AC — enforced on every save (not just the transition
  // into retirement), so it self-heals any already-retired record still carrying a stale
  // AC flag (e.g. one retired before this rule existed) the next time anyone saves it,
  // even a no-op save. The edit form also has no AC checkbox once retired, so this is the
  // only path that can ever flip it off for such a participant.
  const isRetiredNow = body.status === "RETIRED";
  const requestedAc = body.isAssistantCoach === "on" || body.isAssistantCoach === true;
  const newIsAc = isRetiredNow ? false : (requestedAc && isAcEligible(newTskStatus));
  const wasAc = existing?.isAssistantCoach ?? false;
  const acChanged = newIsAc !== wasAc;
  // Removal is immediate (not deferred); promotion stays a deferred, next-month-effective event.
  const isAcRevocation = wasAc && !newIsAc;
  const newSince: Date | null = newIsAc
    ? (wasAc && existing?.assistantCoachSince ? existing.assistantCoachSince : now)
    : null;

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

  // Determine effective level/AC values for the immediate update
  const appliedTskStatus  = (applyNow || !tskStatusChanged) ? newTskStatus  : existing?.tskStatus ?? null;
  const appliedIsAc       = (applyNow || !acChanged || isAcRevocation) ? newIsAc  : wasAc;
  const appliedSince      = (applyNow || !acChanged || isAcRevocation) ? newSince : existing?.assistantCoachSince ?? null;

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
        ...(body.status === "RETIRED" && existing?.status !== "RETIRED" ? {
          retiredAt: new Date(),
          retiredReason: body.retiredReason?.trim() || null,
          retiredReasonOther: body.retiredReason === "Other" ? (body.retiredReasonOther?.trim() || null) : null,
        } : {}),
        ...(body.status === "ACTIVE" ? { retiredAt: null, retiredReason: null, retiredReasonOther: null } : {}),
        isAssistantCoach:    appliedIsAc,
        assistantCoachSince: appliedSince,
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
        mediaReleaseUrl: body.mediaReleaseUrl?.trim() || null,
        mediaReleaseUploadedAt: body.mediaReleaseUploadedAt ? new Date(body.mediaReleaseUploadedAt) : null,
        tskStatus: appliedTskStatus,
        ...(applyNow && tskStatusChanged ? { tskStatusUpdatedAt: now } : {}),
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
        stance: body.stance?.trim() || null,
        paymentMethod: (body.paymentMethod as PaymentMethod) ?? "BOLT_CARD",
        lightningAddress: body.lightningAddress?.trim() || null,
        ...(body.profileLinkUrl !== undefined ? { profileLinkUrl: body.profileLinkUrl || null } : {}),
      },
    });

    if (applyNow && tskStatusChanged && newTskStatus) {
      await prisma.tskLevelHistory.create({
        data: { participantId: id, level: newTskStatus, changedAt: now },
      });
    }

    // Queue or clear pending changes for deferred fields
    if (!applyNow) {
      if (tskStatusChanged) {
        await prisma.pendingParticipantChange.upsert({
          where: { participantId_field: { participantId: id, field: "tskStatus" } },
          create: { id: randomUUID(), participantId: id, field: "tskStatus", oldValue: existing?.tskStatus ?? null, newValue: newTskStatus, effectiveFrom, createdBy: user.id },
          update: { oldValue: existing?.tskStatus ?? null, newValue: newTskStatus, effectiveFrom, createdBy: user.id, appliedAt: null },
        });
      } else {
        // If reverted to current value, cancel any existing pending change
        await prisma.pendingParticipantChange.deleteMany({
          where: { participantId: id, field: "tskStatus", appliedAt: null },
        });
      }

      if (acChanged && !isAcRevocation) {
        // Promotion — stays a deferred, next-month-effective event
        await prisma.pendingParticipantChange.upsert({
          where: { participantId_field: { participantId: id, field: "isAssistantCoach" } },
          create: { id: randomUUID(), participantId: id, field: "isAssistantCoach", oldValue: String(wasAc), newValue: String(newIsAc), effectiveFrom, createdBy: user.id },
          update: { oldValue: String(wasAc), newValue: String(newIsAc), effectiveFrom, createdBy: user.id, appliedAt: null },
        });
      } else {
        // Revocation was already applied immediately above, or there's no AC change at
        // all — either way, clear any stale queued change (also self-heals a pending
        // revocation left over from before this immediate-effect fix existed).
        await prisma.pendingParticipantChange.deleteMany({
          where: { participantId: id, field: "isAssistantCoach", appliedAt: null },
        });
      }
    }

    if (body.status === "RETIRED") {
      await prisma.absenceFlag.deleteMany({ where: { participantId: id } });
      const group = getGroupForStatus(appliedTskStatus);
      if (group) await upsertMonthlyReport(currentMonthStr(), user.id, group);
    }

    if (isAcRevocation) {
      await prisma.assistantCoachPeriod.updateMany({
        where: { participantId: id, endedAt: null },
        data: { endedAt: now },
      });
      const group = getGroupForStatus(appliedTskStatus);
      if (group) await upsertMonthlyReport(currentMonthStr(), user.id, group);
    }

    if (applyNow && acChanged && newIsAc) {
      // Promotion applied directly (edited on the 1st) — open a new period.
      await prisma.assistantCoachPeriod.create({
        data: { id: randomUUID(), participantId: id, startedAt: newSince ?? now, createdBy: user.id },
      });
    }

    const pendingQueued = !applyNow && (tskStatusChanged || (acChanged && !isAcRevocation));

    // Sync to Bolt (use applied values)
    if (existing?.boltUserId) {
      const newKnownAs = body.knownAs?.trim() || null;
      const knownAsPart = newKnownAs ? ` (${newKnownAs})` : '';
      const displayName = `${surname}, ${fullNames}${knownAsPart}`;
      try { await updateBoltUserDisplayName(Number(existing.boltUserId), displayName); } catch { /* non-critical */ }
      try {
        const division = getDivisionLabel(parsed.dob, parsed.gender);
        await updateBoltUserMeta(Number(existing.boltUserId), {
          division,
          tsk_level: appliedTskStatus,
          ac: appliedIsAc,
          tsk_group: getGroupForStatus(appliedTskStatus),
        });
      } catch { /* non-critical */ }
    }

    return Response.json({ success: true, pendingQueued });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A participant with this ID number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update participant" }, { status: 500 });
  }
}
