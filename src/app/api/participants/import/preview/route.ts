import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { parseSaId } from "@/lib/sa-id";

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

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { csvText } = await req.json();

  const lines = (csvText as string).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l: string) => l.trim());
  if (lines.length < 2) {
    return Response.json({ toImport: [], duplicates: [], invalid: [], warnings: ["File appears empty or has no data rows"] });
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCsvRow(lines[0], delimiter).map((h: string) => h.toLowerCase().trim());

  const col = (name: string) => headers.indexOf(name);
  const iFullNames    = col("full names");
  const iSurname      = col("surname");
  const iKnownAs      = col("known as");
  const iIdNumber     = col("sa id number");
  const iBoltCard     = col("pull payment link");
  const iCardNumber   = col("card number");
  const iDateFrom     = col("date from");
  const iProfileLink  = col("profile link");
  const iEthnicity    = col("ethnicity");
  const iLanguage     = col("language");
  const iSchool       = col("school");
  const iGrade        = col("grade");
  const iGuardian     = col("guardian");
  const iGuardianId   = col("guardian id");
  const iRelationship = col("relationship");
  const iAddress      = col("address");
  const iContact1     = col("1st contact");
  const iContact2     = col("2nd contact");
  const iHousingType  = col("housing type");

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
    if (!surname && !fullNames && !idNumber) continue;

    rows.push({
      surname, fullNames,
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

  const existingIds = new Set(
    (await prisma.participant.findMany({ select: { idNumber: true } })).map((p) => p.idNumber),
  );

  const toImport: CsvParticipantRow[] = [];
  const duplicates: CsvParticipantRow[] = [];
  for (const row of valid) {
    if (existingIds.has(row.idNumber)) duplicates.push(row);
    else toImport.push(row);
  }

  return Response.json({ toImport, duplicates, invalid, warnings });
}
