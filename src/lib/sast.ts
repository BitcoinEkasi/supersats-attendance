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

/**
 * Start of today in SAST as a UTC Date for DB range queries.
 * Dates are stored as the SAST calendar date at UTC noon, so we query
 * the full UTC day that matches the SAST date string.
 */
export function getStartOfSASTToday(): Date {
  return new Date(getSASTDateString() + "T00:00:00.000Z");
}

/** End of today in SAST as a UTC Date for DB range queries. */
export function getEndOfSASTToday(): Date {
  return new Date(getSASTDateString() + "T23:59:59.999Z");
}

/** First moment of a given SAST month ("YYYY-MM") as a UTC Date */
export function getStartOfSASTMonth(yearMonth: string): Date {
  return new Date(`${yearMonth}-01T00:00:00.000Z`);
}

/** Last moment of a given SAST month ("YYYY-MM") as a UTC Date */
export function getEndOfSASTMonth(yearMonth: string): Date {
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(`${yearMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`);
}
