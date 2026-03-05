import Papa from "papaparse";

export interface ParsedParticipant {
  csvName: string;
  displayName: string;
}

export function parseParticipantsCSV(csvText: string): {
  participants: ParsedParticipant[];
  warnings: string[];
} {
  const warnings: string[] = [];

  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    quoteChar: '"',
  });

  const participants: ParsedParticipant[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    // Each row is a single quoted cell: "Surname, FirstName, [Gender], [Age]"
    const rawCell = row[0]?.trim();
    if (!rawCell) continue;

    const parts = rawCell.split(",").map((p) => p.trim());
    const surname = parts[0];
    const firstName = parts[1];

    if (!surname || !firstName) {
      warnings.push(`Row ${i + 1}: Could not parse name from "${rawCell}", skipping`);
      continue;
    }

    participants.push({
      csvName: rawCell,
      displayName: `${firstName} ${surname}`,
    });
  }

  return { participants, warnings };
}

export interface ParsedAttendanceRow {
  rawName: string;
  attendance: Record<string, number>; // date string -> 1 or -1
}

export interface ParsedCSV {
  dates: string[];
  rows: ParsedAttendanceRow[];
  warnings: string[];
}

function isValidDateString(str: string): boolean {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(str);
  if (!match) return false;
  const d = new Date(str + "T00:00:00Z");
  return !isNaN(d.getTime());
}

export function parsePresliCSV(csvText: string): ParsedCSV {
  const warnings: string[] = [];

  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    quoteChar: '"',
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      warnings.push(`Row ${err.row}: ${err.message}`);
    }
  }

  const data = result.data;
  if (data.length < 2) {
    return { dates: [], rows: [], warnings: ["CSV must have at least a header row and one data row"] };
  }

  // Extract header row
  const headerRow = data[0];
  const nameHeader = headerRow[0]?.trim();
  if (nameHeader !== "Name") {
    warnings.push(`Expected first column "Name", got "${nameHeader}"`);
  }

  // Parse date columns
  const dates: string[] = [];
  const dateColumnIndices: number[] = [];
  for (let i = 1; i < headerRow.length; i++) {
    const dateStr = headerRow[i]?.trim();
    if (!dateStr) continue;
    if (!isValidDateString(dateStr)) {
      warnings.push(`Column ${i + 1}: Invalid date "${dateStr}", skipping`);
      continue;
    }
    dates.push(dateStr);
    dateColumnIndices.push(i);
  }

  // Parse data rows
  const rows: ParsedAttendanceRow[] = [];
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const rawName = row[0]?.trim();
    if (!rawName) continue;

    const attendance: Record<string, number> = {};

    for (let j = 0; j < dateColumnIndices.length; j++) {
      const colIdx = dateColumnIndices[j];
      const value = row[colIdx]?.trim();
      const date = dates[j];

      if (value === "1") {
        attendance[date] = 1;
      } else if (value === "-1") {
        attendance[date] = -1;
      }
      // Empty or other values: skip (no record for this date)
    }

    rows.push({ rawName, attendance });
  }

  return { dates, rows, warnings };
}

export function detectMonth(dates: string[]): string {
  if (dates.length === 0) return "";
  // Use the most common year-month from the dates
  const months: Record<string, number> = {};
  for (const d of dates) {
    const ym = d.substring(0, 7);
    months[ym] = (months[ym] || 0) + 1;
  }
  return Object.entries(months).sort((a, b) => b[1] - a[1])[0][0];
}
