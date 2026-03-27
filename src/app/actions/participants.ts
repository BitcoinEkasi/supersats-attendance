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
  const cardNumber = (formData.get("cardNumber") as string)?.trim() || null;
  const cardBalance = formData.get("cardBalance") ? parseFloat(formData.get("cardBalance") as string) || null : null;
  const status = (formData.get("status") as ParticipantStatus) || "ACTIVE";
  const profilePicture = (formData.get("profilePicture") as string) || null;
  const registrationDateRaw = (formData.get("registrationDate") as string)?.trim() || null;
  const ethnicity = (formData.get("ethnicity") as string)?.trim() || null;
  const language = (formData.get("language") as string)?.trim() || null;
  const school = (formData.get("school") as string)?.trim() || null;
  const grade = (formData.get("grade") as string)?.trim() || null;
  const guardian = (formData.get("guardian") as string)?.trim() || null;
  const guardianId = (formData.get("guardianId") as string)?.trim() || null;
  const guardianRelationship = (formData.get("guardianRelationship") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const contact1 = (formData.get("contact1") as string)?.trim() || null;
  const contact2 = (formData.get("contact2") as string)?.trim() || null;
  const housingType = (formData.get("housingType") as string)?.trim() || null;
  const idDocumentUrl = (formData.get("idDocumentUrl") as string)?.trim() || null;
  const tskStatus = (formData.get("tskStatus") as string)?.trim() || null;
  const weightKg = formData.get("weightKg") ? parseFloat(formData.get("weightKg") as string) || null : null;
  const heightCm = formData.get("heightCm") ? parseFloat(formData.get("heightCm") as string) || null : null;
  const tshirtSize = (formData.get("tshirtSize") as string)?.trim() || null;
  const shoeSize = (formData.get("shoeSize") as string)?.trim() || null;
  const wetsuiteSize = (formData.get("wetsuiteSize") as string)?.trim() || null;

  if (!surname || !fullNames || !idNumber) {
    return { error: "Surname, full names, and ID number are required" };
  }

  const parsed = parseSaId(idNumber);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const registrationDate = registrationDateRaw ? new Date(registrationDateRaw + "T00:00:00Z") : new Date();

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
          cardNumber,
          cardBalance,
          status,
          profilePicture,
          registrationDate,
          ethnicity,
          language,
          school,
          grade,
          guardian,
          guardianId,
          guardianRelationship,
          address,
          contact1,
          contact2,
          housingType,
          idDocumentUrl,
          tskStatus,
          weightKg,
          heightCm,
          tshirtSize,
          shoeSize,
          wetsuiteSize,
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
  const cardNumber = (formData.get("cardNumber") as string)?.trim() || null;
  const cardBalance = formData.get("cardBalance") ? parseFloat(formData.get("cardBalance") as string) || null : null;
  const status = formData.get("status") as ParticipantStatus;
  const profilePicture = (formData.get("profilePicture") as string) || null;
  const registrationDateRaw = (formData.get("registrationDate") as string)?.trim() || null;
  const ethnicity = (formData.get("ethnicity") as string)?.trim() || null;
  const language = (formData.get("language") as string)?.trim() || null;
  const school = (formData.get("school") as string)?.trim() || null;
  const grade = (formData.get("grade") as string)?.trim() || null;
  const guardian = (formData.get("guardian") as string)?.trim() || null;
  const guardianId = (formData.get("guardianId") as string)?.trim() || null;
  const guardianRelationship = (formData.get("guardianRelationship") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const contact1 = (formData.get("contact1") as string)?.trim() || null;
  const contact2 = (formData.get("contact2") as string)?.trim() || null;
  const housingType = (formData.get("housingType") as string)?.trim() || null;
  const idDocumentUrl = (formData.get("idDocumentUrl") as string)?.trim() || null;
  const tskStatus = (formData.get("tskStatus") as string)?.trim() || null;
  const weightKg = formData.get("weightKg") ? parseFloat(formData.get("weightKg") as string) || null : null;
  const heightCm = formData.get("heightCm") ? parseFloat(formData.get("heightCm") as string) || null : null;
  const tshirtSize = (formData.get("tshirtSize") as string)?.trim() || null;
  const shoeSize = (formData.get("shoeSize") as string)?.trim() || null;
  const wetsuiteSize = (formData.get("wetsuiteSize") as string)?.trim() || null;

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
        cardNumber,
        cardBalance,
        status,
        ethnicity,
        language,
        school,
        grade,
        guardian,
        guardianId,
        guardianRelationship,
        address,
        contact1,
        contact2,
        housingType,
        idDocumentUrl,
        tskStatus,
        weightKg,
        heightCm,
        tshirtSize,
        shoeSize,
        wetsuiteSize,
        ...(registrationDateRaw ? { registrationDate: new Date(registrationDateRaw + "T00:00:00Z") } : {}),
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
  const user = await requireRole(["MARSHALL", "ADMINISTRATOR"]);

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

// ─── CSV Import ───────────────────────────────────────────────────────────────

export interface CsvParticipantRow {
  surname: string;
  fullNames: string;
  knownAs: string | null;
  idNumber: string;
  boltCardUrl: string | null;
  cardNumber: string | null;
  registrationDate: string | null;
  profilePicture: string | null;
  ethnicity: string | null;
  language: string | null;
  school: string | null;
  grade: string | null;
  guardian: string | null;
  guardianId: string | null;
  guardianRelationship: string | null;
  address: string | null;
  contact1: string | null;
  contact2: string | null;
  housingType: string | null;
  rowIndex: number;
  parseError?: string;
}

export interface CsvImportPreview {
  toImport: CsvParticipantRow[];
  duplicates: CsvParticipantRow[];
  invalid: CsvParticipantRow[];
  warnings: string[];
}

function parseCsvRow(row: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseFlexDate(val: string): Date | null {
  if (!val) return null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + "T00:00:00Z");
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}T00:00:00Z`);
  // Try MM/DD/YYYY
  const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(`${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}T00:00:00Z`);
  return null;
}

export async function previewParticipantCsvImport(csvText: string): Promise<CsvImportPreview> {
  await requireRole(["ADMINISTRATOR"]);

  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return { toImport: [], duplicates: [], invalid: [], warnings: ["File appears empty or has no data rows"] };

  // Detect delimiter: tab or comma
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCsvRow(lines[0], delimiter).map(h => h.toLowerCase().trim());

  // Column index lookup
  const col = (name: string) => headers.indexOf(name);
  const iFullNames     = col("full names");
  const iSurname       = col("surname");
  const iKnownAs       = col("known as");
  const iIdNumber      = col("sa id number");
  const iBoltCard      = col("pull payment link");
  const iCardNumber    = col("card number");
  const iDateFrom      = col("date from");
  const iProfileLink   = col("profile link");
  const iEthnicity     = col("ethnicity");
  const iLanguage      = col("language");
  const iSchool        = col("school");
  const iGrade         = col("grade");
  const iGuardian      = col("guardian");
  const iGuardianId    = col("guardian id");
  const iRelationship  = col("relationship");
  const iAddress       = col("address");
  const iContact1      = col("1st contact");
  const iContact2      = col("2nd contact");
  const iHousingType   = col("housing type");

  const warnings: string[] = [];
  if (iIdNumber === -1) warnings.push("Column 'SA ID Number' not found — ID validation will be skipped");
  if (iSurname === -1)  warnings.push("Column 'Surname' not found");
  if (iFullNames === -1) warnings.push("Column 'Full Names' not found");

  const rows: CsvParticipantRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvRow(lines[i], delimiter);
    const get = (idx: number) => (idx !== -1 && fields[idx] ? fields[idx].trim() : "");

    const surname   = get(iSurname);
    const fullNames = get(iFullNames);
    const idNumber  = get(iIdNumber).replace(/\s/g, "");
    if (!surname && !fullNames && !idNumber) continue; // skip blank rows

    rows.push({
      surname,
      fullNames,
      knownAs:              get(iKnownAs) || null,
      idNumber,
      boltCardUrl:          get(iBoltCard) || null,
      cardNumber:           get(iCardNumber) || null,
      registrationDate:     get(iDateFrom) || null,
      profilePicture:       get(iProfileLink) || null,
      ethnicity:            get(iEthnicity) || null,
      language:             get(iLanguage) || null,
      school:               get(iSchool) || null,
      grade:                get(iGrade) || null,
      guardian:             get(iGuardian) || null,
      guardianId:           get(iGuardianId) || null,
      guardianRelationship: get(iRelationship) || null,
      address:              get(iAddress) || null,
      contact1:             get(iContact1) || null,
      contact2:             get(iContact2) || null,
      housingType:          get(iHousingType) || null,
      rowIndex: i + 1,
    });
  }

  // Validate each row
  const invalid: CsvParticipantRow[] = [];
  const valid: CsvParticipantRow[] = [];
  for (const row of rows) {
    if (!row.surname || !row.fullNames) {
      invalid.push({ ...row, parseError: "Missing surname or full names" });
      continue;
    }
    if (!row.idNumber) {
      invalid.push({ ...row, parseError: "Missing SA ID Number" });
      continue;
    }
    const parsed = parseSaId(row.idNumber);
    if ("error" in parsed) {
      invalid.push({ ...row, parseError: parsed.error });
      continue;
    }
    valid.push(row);
  }

  // Check for duplicates against existing participants
  const existingIds = new Set(
    (await prisma.participant.findMany({ select: { idNumber: true } })).map(p => p.idNumber)
  );

  const toImport: CsvParticipantRow[] = [];
  const duplicates: CsvParticipantRow[] = [];
  for (const row of valid) {
    if (existingIds.has(row.idNumber)) duplicates.push(row);
    else toImport.push(row);
  }

  return { toImport, duplicates, invalid, warnings };
}

export async function commitParticipantCsvImport(rows: CsvParticipantRow[]) {
  await requireRole(["ADMINISTRATOR"]);

  if (rows.length === 0) return { added: 0 };

  const results = await prisma.$transaction(async (tx) => {
    const last = await tx.participant.findFirst({ orderBy: { tskId: "desc" }, select: { tskId: true } });
    let nextNum = last ? parseInt(last.tskId.replace("TSK", "")) + 1 : 1;
    let added = 0;

    for (const row of rows) {
      const parsed = parseSaId(row.idNumber);
      if ("error" in parsed) continue;

      const regDate = row.registrationDate ? parseFlexDate(row.registrationDate) : null;

      await tx.participant.create({
        data: {
          tskId:                `TSK${String(nextNum).padStart(5, "0")}`,
          surname:              row.surname,
          fullNames:            row.fullNames,
          knownAs:              row.knownAs || null,
          idNumber:             row.idNumber,
          gender:               parsed.gender,
          dateOfBirth:          parsed.dob,
          boltCardUrl:          row.boltCardUrl || null,
          cardNumber:           row.cardNumber || null,
          profilePicture:       row.profilePicture || null,
          registrationDate:     regDate || new Date(),
          status:               "ACTIVE",
          ethnicity:            row.ethnicity || null,
          language:             row.language || null,
          school:               row.school || null,
          grade:                row.grade || null,
          guardian:             row.guardian || null,
          guardianId:           row.guardianId || null,
          guardianRelationship: row.guardianRelationship || null,
          address:              row.address || null,
          contact1:             row.contact1 || null,
          contact2:             row.contact2 || null,
          housingType:          row.housingType || null,
        },
      });
      nextNum++;
      added++;
    }
    return added;
  });

  revalidatePath("/participants");
  return { added: results };
}

export async function updateParticipantPhoto(id: string, profilePicture: string) {
  await requireRole(["ADMINISTRATOR"]);
  await prisma.participant.update({ where: { id }, data: { profilePicture } });
  revalidatePath(`/participants/${id}`);
  return { success: true };
}

export async function updateParticipantDates(rows: CsvParticipantRow[]) {
  await requireRole(["ADMINISTRATOR"]);

  if (rows.length === 0) return { updated: 0 };

  let updated = 0;
  for (const row of rows) {
    const regDate = row.registrationDate ? parseFlexDate(row.registrationDate) : null;
    await prisma.participant.update({
      where: { idNumber: row.idNumber },
      data: {
        ...(regDate ? { registrationDate: regDate } : {}),
        ...(row.knownAs ? { knownAs: row.knownAs } : {}),
        ...(row.boltCardUrl ? { boltCardUrl: row.boltCardUrl } : {}),
        ...(row.cardNumber ? { cardNumber: row.cardNumber } : {}),
        ...(row.profilePicture ? { profilePicture: row.profilePicture } : {}),
        ...(row.ethnicity ? { ethnicity: row.ethnicity } : {}),
        ...(row.language ? { language: row.language } : {}),
        ...(row.school ? { school: row.school } : {}),
        ...(row.grade ? { grade: row.grade } : {}),
        ...(row.guardian ? { guardian: row.guardian } : {}),
        ...(row.guardianId ? { guardianId: row.guardianId } : {}),
        ...(row.guardianRelationship ? { guardianRelationship: row.guardianRelationship } : {}),
        ...(row.address ? { address: row.address } : {}),
        ...(row.contact1 ? { contact1: row.contact1 } : {}),
        ...(row.contact2 ? { contact2: row.contact2 } : {}),
        ...(row.housingType ? { housingType: row.housingType } : {}),
      },
    });
    updated++;
  }

  revalidatePath("/participants");
  return { updated };
}
