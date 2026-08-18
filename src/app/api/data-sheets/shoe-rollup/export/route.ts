import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { fmtDate } from "@/lib/format-date";
import { computeShoeRollup, filterRollupByGroup, NOT_RECORDED } from "@/lib/shoe-rollup";
import { SHOE_SIZES } from "@/lib/shoe-sizes";
import { isValidGroup } from "@/lib/tsk-groups";
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
  const groupParam = searchParams.get("group");
  const group = isValidGroup(groupParam) ? groupParam : "all";

  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: { tskStatus: true, shoeSize: true },
  });

  const rollup = filterRollupByGroup(computeShoeRollup(participants), group);
  const columns = [...SHOE_SIZES, NOT_RECORDED];
  const filenameSuffix = group === "all" ? "" : `-${group.toLowerCase().replace(/_/g, "-")}`;

  if (format === "csv") {
    const headers = ["Group", ...columns, "Total"];
    const rows = rollup.rows.map((row) =>
      [esc(row.label), ...columns.map((c) => esc(row.counts[c] ?? 0)), esc(row.total)].join(",")
    );
    const lines = [headers.join(","), ...rows];
    if (group === "all") {
      lines.push(["Total", ...columns.map((c) => esc(rollup.columnTotals[c] ?? 0)), esc(rollup.grandTotal)].join(","));
    }
    const csv = lines.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tsk-shoe-size-rollup${filenameSuffix}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const data: ShoeRollupPdfData = {
    columns,
    rows: rollup.rows.map((row) => ({ label: row.label, counts: row.counts, total: row.total })),
    columnTotals: rollup.columnTotals,
    grandTotal: rollup.grandTotal,
    showTotalRow: group === "all",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ShoeRollupPdfDocument, { generatedAt: fmtDate(new Date()), data }) as any;
  const pdfBuffer = await renderToBuffer(el);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tsk-shoe-size-rollup${filenameSuffix}-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
