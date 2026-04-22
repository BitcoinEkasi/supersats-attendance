import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHAL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const participants = await prisma.participant.findMany({
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });

  const headers = [
    "TSK ID", "Surname", "Full Names", "Known As", "Gender", "Date of Birth",
    "Status", "Junior Coach", "Level", "Registration Date",
    "Ethnicity", "Language", "School", "Grade",
    "Guardian", "Guardian ID", "Relationship",
    "Address", "Contact 1", "Contact 2", "Housing Type",
    "Bolt Card",
    "ID Document", "Indemnity Form",
  ];

  function esc(val: string | null | undefined): string {
    if (!val) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  const rows = participants.map((p) => [
    esc(p.tskId),
    esc(p.surname),
    esc(p.fullNames),
    esc(p.knownAs),
    p.gender === "MALE" ? "Male" : "Female",
    p.dateOfBirth.toISOString().split("T")[0],
    p.status.charAt(0) + p.status.slice(1).toLowerCase(),
    p.isJuniorCoach ? "Yes" : "No",
    esc(p.tskStatus),
    p.registrationDate.toISOString().split("T")[0],
    esc(p.ethnicity),
    esc(p.language),
    esc(p.school),
    esc(p.grade),
    esc(p.guardian),
    esc(p.guardianId),
    esc(p.guardianRelationship),
    esc(p.address),
    esc(p.contact1),
    esc(p.contact2),
    esc(p.housingType),
    p.boltUserId ? "Yes" : "No",
    p.idDocumentUrl ? "Yes" : "No",
    p.indemnityFormUrl ? "Yes" : "No",
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv" } });
}
