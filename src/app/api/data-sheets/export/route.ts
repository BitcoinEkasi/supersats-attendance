import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { fmtDate } from "@/lib/format-date";
import { TSK_GROUP_LABELS, getGroupForStatus } from "@/lib/tsk-groups";
import { BodyMeasurementsPdfDocument, type BodyMeasurementsPdfEntry } from "@/lib/data-sheet-pdf";
import React from "react";

function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const participantIds = Array.isArray(body.participantIds) ? (body.participantIds as string[]) : [];
  const format = body.format === "pdf" ? "pdf" : "csv";

  if (participantIds.length === 0) {
    return Response.json({ error: "No participants selected" }, { status: 400 });
  }

  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds }, status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
    select: {
      tskId: true, surname: true, fullNames: true, knownAs: true, tskStatus: true,
      weightKg: true, heightCm: true, tshirtSize: true, shoeSize: true, wetsuiteSize: true,
      measurementsUpdatedAt: true,
    },
  });

  if (format === "csv") {
    const headers = [
      "TSK ID", "Surname", "Full Names", "Known As", "Group",
      "Weight (kg)", "Height (cm)", "T-Shirt Size", "Shoe Size (UK)", "Wetsuit Size", "Last Updated",
    ];
    const rows = participants.map((p) => {
      const group = getGroupForStatus(p.tskStatus);
      return [
        esc(p.tskId),
        esc(p.surname),
        esc(p.fullNames),
        esc(p.knownAs),
        esc(group ? TSK_GROUP_LABELS[group] : ""),
        esc(p.weightKg),
        esc(p.heightCm),
        esc(p.tshirtSize),
        esc(p.shoeSize),
        esc(p.wetsuiteSize),
        esc(p.measurementsUpdatedAt ? p.measurementsUpdatedAt.toISOString().split("T")[0] : ""),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tsk-body-measurements-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const entries: BodyMeasurementsPdfEntry[] = participants.map((p) => {
    const group = getGroupForStatus(p.tskStatus);
    const name = p.knownAs ? `${p.knownAs} (${p.surname})` : `${p.surname}, ${p.fullNames}`;
    return {
      tskId: p.tskId,
      name,
      group: group ? TSK_GROUP_LABELS[group] : null,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      tshirtSize: p.tshirtSize,
      shoeSize: p.shoeSize,
      wetsuiteSize: p.wetsuiteSize,
      updatedAt: p.measurementsUpdatedAt ? fmtDate(p.measurementsUpdatedAt) : null,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(BodyMeasurementsPdfDocument, { generatedAt: fmtDate(new Date()), entries }) as any;
  const pdfBuffer = await renderToBuffer(el);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tsk-body-measurements-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
