import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { fmtDate } from "@/lib/format-date";
import { computeShoeRollup, NOT_RECORDED } from "@/lib/shoe-rollup";
import { SHOE_SIZES } from "@/lib/shoe-sizes";
import { ShoeRollupPdfDocument, type ShoeRollupPdfData } from "@/lib/data-sheet-pdf";
import React from "react";

function esc(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: { tskStatus: true, shoeSize: true },
  });

  const rollup = computeShoeRollup(participants);
  const columns = [...SHOE_SIZES, NOT_RECORDED];

  if (format === "csv") {
    const headers = ["Group", ...columns, "Total"];
    const rows = rollup.rows.map((row) =>
      [esc(row.label), ...columns.map((c) => esc(row.counts[c] ?? 0)), esc(row.total)].join(",")
    );
    const totalRow = ["Total", ...columns.map((c) => esc(rollup.columnTotals[c] ?? 0)), esc(rollup.grandTotal)].join(",");
    const csv = [headers.join(","), ...rows, totalRow].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tsk-shoe-size-rollup-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const data: ShoeRollupPdfData = {
    columns,
    rows: rollup.rows.map((row) => ({ label: row.label, counts: row.counts, total: row.total })),
    columnTotals: rollup.columnTotals,
    grandTotal: rollup.grandTotal,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ShoeRollupPdfDocument, { generatedAt: fmtDate(new Date()), data }) as any;
  const pdfBuffer = await renderToBuffer(el);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tsk-shoe-size-rollup-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
