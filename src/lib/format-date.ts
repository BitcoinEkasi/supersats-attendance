const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Format a Date as "DD MMM 'YY", e.g. "05 Apr '26". Uses UTC to match DB storage. */
export function fmtDate(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString().slice(-2);
  return `${day} ${month} '${year}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Zero-padded day of month, e.g. "01". Uses UTC to match DB storage/noon-anchor convention. */
export function fmtDayNumber(date: Date): string {
  return date.getUTCDate().toString().padStart(2, "0");
}

/** Short weekday name, e.g. "Wed". Uses UTC to match DB storage/noon-anchor convention. */
export function fmtWeekdayShort(date: Date): string {
  return WEEKDAYS_SHORT[date.getUTCDay()];
}
