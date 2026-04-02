import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";
import { getNextTskId } from "@/lib/tsk-id";
import type { ParticipantStatus } from "@prisma/client";

export async function GET(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;

  const where = search
    ? {
        OR: [
          { tskId: { contains: search } },
          { surname: { contains: search } },
          { fullNames: { contains: search } },
          { knownAs: { contains: search } },
        ],
      }
    : {};

  const participants = await prisma.participant.findMany({
    where,
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });

  return Response.json(participants);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

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

  const registrationDate = body.registrationDate
    ? new Date(body.registrationDate + "T00:00:00Z")
    : new Date();

  try {
    const participant = await prisma.$transaction(async (tx) => {
      const tskId = await getNextTskId(tx);
      return tx.participant.create({
        data: {
          tskId,
          surname,
          fullNames,
          knownAs: body.knownAs?.trim() || null,
          idNumber,
          gender: parsed.gender,
          dateOfBirth: parsed.dob,
          boltCardUrl: body.boltCardUrl?.trim() || null,
          cardNumber: body.cardNumber?.trim() || null,
          cardBalance: body.cardBalance ? parseFloat(body.cardBalance) || null : null,
          status: (body.status as ParticipantStatus) || "ACTIVE",
          isJuniorCoach: body.isJuniorCoach === "on" || body.isJuniorCoach === true,
          profilePicture: body.profilePicture || null,
          registrationDate,
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
        },
      });
    });

    return Response.json({ id: participant.id, tskId: participant.tskId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A participant with this ID number already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to create participant" }, { status: 500 });
  }
}
