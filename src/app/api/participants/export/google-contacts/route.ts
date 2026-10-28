import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getGroupForStatus, TSK_GROUP_LABELS } from "@/lib/tsk-groups";

// Google Contacts CSV: guardian + participant go in First Name,
// e.g. "Jane Doe [John Doe (JD)] TSK" (TSK suffix for quick WhatsApp search); relationship and address go in Notes.
// Labels: "TSK Parent/Guardian" plus a per-group label, e.g. "TSK Parent/Guardian - Seals".
export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
  });

  const headers = [
    "First Name", "Last Name", "Notes", "Labels",
    "Phone 1 - Label", "Phone 1 - Value",
    "Phone 2 - Label", "Phone 2 - Value",
  ];

  function esc(val: string | null | undefined): string {
    if (!val) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  const rows = participants
    .filter((p) => p.contact1?.trim() || p.contact2?.trim())
    .map((p) => {
      const knownAs = p.knownAs?.trim();
      const showKnownAs = knownAs && knownAs.toLowerCase() !== p.fullNames.trim().toLowerCase();
      const child = `${p.fullNames.trim()} ${p.surname.trim()}${showKnownAs ? ` (${knownAs})` : ""}`;
      const guardian = p.guardian?.trim() || "Guardian of";
      const notes = [
        p.guardianRelationship?.trim() && `Relationship: ${p.guardianRelationship.trim()}`,
        p.address?.trim() && `Address: ${p.address.trim()}`,
      ].filter(Boolean).join("\n");
      const phone1 = p.contact1?.trim() || p.contact2?.trim();
      const group = getGroupForStatus(p.tskStatus);
      const labels = ["TSK Parent/Guardian", group && `TSK Parent/Guardian - ${TSK_GROUP_LABELS[group]}`, "* myContacts"]
        .filter(Boolean).join(" ::: ");
      const phone2 = p.contact1?.trim() ? p.contact2?.trim() : "";

      return [
        esc(`${guardian} [${child}] TSK`),
        "",
        esc(notes),
        esc(labels),
        phone1 ? "Mobile" : "",
        esc(phone1),
        phone2 ? "Mobile" : "",
        esc(phone2),
      ].join(",");
    });

  const csv = "﻿" + [headers.join(","), ...rows].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
