import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireAuth } from "@/lib/api-auth";
import { getAbsenceBadgeGroups } from "@/lib/absence-badges";
import { AbsenceBadgeDocument } from "@/lib/absence-badge-pdf";
import { fmtDate } from "@/lib/format-date";
import { getSASTDateString } from "@/lib/sast";

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await getAbsenceBadgeGroups();
  if (groups.length === 0) {
    return Response.json({ error: "No absence alerts to export" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(AbsenceBadgeDocument, {
    generatedAt: fmtDate(new Date()),
    groups,
  }) as any;

  const pdfBuffer = await renderToBuffer(el);
  const filename = `absence-badges-${getSASTDateString()}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
