// South African Standard Time — UTC+2, no DST

/** Current date string in SAST: "YYYY-MM-DD" */
export function getSASTDateString(): string {
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return sast.toISOString().split("T")[0];
}

/** Current SAST date broken into components (month is 1-indexed) */
export function getSASTNow(): { year: number; month: number; day: number } {
  const [year, month, day] = getSASTDateString().split("-").map(Number);
  return { year, month, day };
}

/** Midnight at the start of today SAST, as a UTC Date (for DB range queries) */
export function getStartOfSASTToday(): Date {
  return new Date(getSASTDateString() + "T00:00:00+02:00");
}

/** 23:59:59 at the end of today SAST, as a UTC Date */
export function getEndOfSASTToday(): Date {
  return new Date(getSASTDateString() + "T23:59:59+02:00");
}

/** First moment of a given SAST month ("YYYY-MM") as a UTC Date */
export function getStartOfSASTMonth(yearMonth: string): Date {
  return new Date(`${yearMonth}-01T00:00:00+02:00`);
}

/** Last moment of a given SAST month ("YYYY-MM") as a UTC Date */
export function getEndOfSASTMonth(yearMonth: string): Date {
  const [y, m] = yearMonth.split("-").map(Number);
  // Last day of the month: day 0 of the next month
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(`${yearMonth}-${String(lastDay).padStart(2, "0")}T23:59:59+02:00`);
}
