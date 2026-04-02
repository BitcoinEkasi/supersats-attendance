import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";
import type { ParticipantStatus } from "@prisma/client";

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

  // Status-only update
  if (body.status && Object.keys(body).length === 1) {
    try {
      await prisma.participant.update({ where: { id }, data: { status: body.status as ParticipantStatus } });
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
        boltCardUrl: body.boltCardUrl?.trim() || null,
        cardNumber: body.cardNumber?.trim() || null,
        cardBalance: body.cardBalance ? parseFloat(body.cardBalance) || null : null,
        status: body.status as ParticipantStatus,
        isJuniorCoach: body.isJuniorCoach === "on" || body.isJuniorCoach === true,
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
        tskStatus: body.tskStatus?.trim() || null,
        weightKg: body.weightKg ? parseFloat(body.weightKg) || null : null,
        heightCm: body.heightCm ? parseFloat(body.heightCm) || null : null,
        tshirtSize: body.tshirtSize?.trim() || null,
        shoeSize: body.shoeSize?.trim() || null,
        wetsuiteSize: body.wetsuiteSize?.trim() || null,
        notes: body.notes?.trim() || null,
        ...(body.registrationDate ? { registrationDate: new Date(body.registrationDate + "T00:00:00Z") } : {}),
        ...(body.profilePicture !== undefined ? { profilePicture: body.profilePicture || null } : {}),
      },
    });
    return Response.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A participant with this ID number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update participant" }, { status: 500 });
  }
}
