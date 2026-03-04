"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parsePresliCSV, detectMonth } from "@/lib/csv-parser";
import { revalidatePath } from "next/cache";

export interface ImportPreview {
  dates: string[];
  month: string;
  matched: { csvName: string; participantId: string; displayName: string; attendance: Record<string, number> }[];
  unmatched: { csvName: string; attendance: Record<string, number> }[];
  warnings: string[];
}

export async function previewCSVImport(csvText: string, filename: string): Promise<ImportPreview> {
  const parsed = parsePresliCSV(csvText);
  const month = detectMonth(parsed.dates);

  const participants = await prisma.participant.findMany({
    where: { isActive: true },
  });

  // Build lookup by csv_name (case-insensitive)
  const nameMap = new Map<string, { id: string; displayName: string }>();
  for (const p of participants) {
    nameMap.set(p.csvName.toLowerCase().trim(), {
      id: p.id,
      displayName: p.displayName,
    });
  }

  const matched: ImportPreview["matched"] = [];
  const unmatched: ImportPreview["unmatched"] = [];

  for (const row of parsed.rows) {
    const key = row.rawName.toLowerCase().trim();
    const participant = nameMap.get(key);

    if (participant) {
      matched.push({
        csvName: row.rawName,
        participantId: participant.id,
        displayName: participant.displayName,
        attendance: row.attendance,
      });
    } else {
      unmatched.push({
        csvName: row.rawName,
        attendance: row.attendance,
      });
    }
  }

  return {
    dates: parsed.dates,
    month,
    matched,
    unmatched,
    warnings: parsed.warnings,
  };
}

export async function commitCSVImport(
  csvText: string,
  filename: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const parsed = parsePresliCSV(csvText);
  const month = detectMonth(parsed.dates);

  const participants = await prisma.participant.findMany({
    where: { isActive: true },
  });

  const nameMap = new Map<string, string>();
  for (const p of participants) {
    nameMap.set(p.csvName.toLowerCase().trim(), p.id);
  }

  const matchedRows: { participantId: string; attendance: Record<string, number> }[] = [];
  const unmatchedNames: string[] = [];

  for (const row of parsed.rows) {
    const key = row.rawName.toLowerCase().trim();
    const participantId = nameMap.get(key);

    if (participantId) {
      matchedRows.push({ participantId, attendance: row.attendance });
    } else {
      unmatchedNames.push(row.rawName);
    }
  }

  // Create import batch and attendance records in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        filename,
        month,
        importedBy: session.user!.id!,
        recordCount: 0,
        matchedCount: matchedRows.length,
        unmatchedNames,
      },
    });

    let recordCount = 0;

    for (const row of matchedRows) {
      for (const [dateStr, status] of Object.entries(row.attendance)) {
        const date = new Date(dateStr + "T00:00:00Z");
        await tx.attendanceRecord.upsert({
          where: {
            participantId_date: {
              participantId: row.participantId,
              date,
            },
          },
          update: { status, importBatchId: batch.id },
          create: {
            participantId: row.participantId,
            date,
            status,
            importBatchId: batch.id,
          },
        });
        recordCount++;
      }
    }

    await tx.importBatch.update({
      where: { id: batch.id },
      data: { recordCount },
    });

    return { batchId: batch.id, recordCount, matchedCount: matchedRows.length, unmatchedCount: unmatchedNames.length };
  });

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}
