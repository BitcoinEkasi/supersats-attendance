import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";
import type { CsvParticipantRow } from "../preview/route";

function parseFlexDate(val: string): Date | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + "T00:00:00Z");
  const dmy = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T00:00:00Z`);
  const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(`${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}T00:00:00Z`);
  return null;
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rows, mode } = (await req.json()) as { rows: CsvParticipantRow[]; mode?: "import" | "update" };

  if (rows.length === 0) return Response.json({ added: 0, updated: 0 });

  if (mode === "update") {
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
    return Response.json({ added: 0, updated });
  }

  const added = await prisma.$transaction(async (tx) => {
    const last = await tx.participant.findFirst({ orderBy: { tskId: "desc" }, select: { tskId: true } });
    let nextNum = last ? parseInt(last.tskId.replace("TSK", "")) + 1 : 1;
    let count = 0;

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
      count++;
    }
    return count;
  });

  return Response.json({ added, updated: 0 });
}
