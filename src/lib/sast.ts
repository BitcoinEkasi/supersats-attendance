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

/** Every calendar day in a SAST month ("YYYY-MM"), as "YYYY-MM-DD" strings, in order. */
export function getDaysInSASTMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // same trick as getEndOfSASTMonth
  return Array.from({ length: lastDay }, (_, i) => `${yearMonth}-${String(i + 1).padStart(2, "0")}`);
}

/** True if the date falls on a programme day (Tue-Sat). Sun/Mon are official off days. */
export function isProgrammeDay(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay(); // 0=Sun..6=Sat, noon-UTC anchor matches event storage
  return day !== 0 && day !== 1;
}

/** True if the date falls on a Saturday. */
export function isSaturdaySAST(dateStr: string): boolean {
  return new Date(`${dateStr}T12:00:00.000Z`).getUTCDay() === 6;
}

/** Current time-of-day in SAST, as hour (0-23) and minute (0-59). */
export function getSASTTimeOfDay(): { hour: number; minute: number } {
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return { hour: sast.getUTCHours(), minute: sast.getUTCMinutes() };
}

/** Formats a SAST date string as "Wed, 22 Jul, '26" — used in the TSK Pulse email subject. */
export function formatPulseDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  const weekday = d.toLocaleDateString("en-ZA", { weekday: "short", timeZone: "UTC" });
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-ZA", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${weekday}, ${day} ${month}, '${year}`;
}

/** The last N SAST months (including the current one), as "YYYY-MM" values with display labels. */
export function getLastNMonths(n: number, opts?: { order?: "newest-first" | "oldest-first" }): { value: string; label: string }[] {
  const { year, month } = getSASTNow();
  const result: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    let m = month - i;
    let y = year;
    while (m <= 0) { m += 12; y -= 1; }
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(`${value}-15T12:00:00Z`).toLocaleString("en-ZA", { month: "long", year: "numeric" });
    result.push({ value, label });
  }
  return opts?.order === "oldest-first" ? result.reverse() : result;
}

/** Every SAST month from `startMonth` ("YYYY-MM") through the current month, inclusive. */
export function getMonthsFrom(startMonth: string, opts?: { order?: "newest-first" | "oldest-first" }): { value: string; label: string }[] {
  const { year: curYear, month: curMonth } = getSASTNow();
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const result: { value: string; label: string }[] = [];
  let y = startYear;
  let m = startMon;
  while (y < curYear || (y === curYear && m <= curMonth)) {
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(`${value}-15T12:00:00Z`).toLocaleString("en-ZA", { month: "long", year: "numeric" });
    result.push({ value, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return opts?.order === "newest-first" ? result.reverse() : result;
}

/** Exactly N SAST months starting from `startMonth` ("YYYY-MM"), regardless of today —
 * unlike getMonthsFrom, this can extend past the current month into the future. */
export function getNMonthsFrom(startMonth: string, n: number, opts?: { order?: "newest-first" | "oldest-first" }): { value: string; label: string }[] {
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const result: { value: string; label: string }[] = [];
  let y = startYear;
  let m = startMon;
  for (let i = 0; i < n; i++) {
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(`${value}-15T12:00:00Z`).toLocaleString("en-ZA", { month: "long", year: "numeric" });
    result.push({ value, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return opts?.order === "newest-first" ? result.reverse() : result;
}
