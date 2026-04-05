import type { Gender } from "@prisma/client";
import { getSASTNow } from "./sast";

export type SaIdResult =
  | { dob: Date; gender: Gender }
  | { error: string };

function luhnCheck(id: string): boolean {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    let digit = parseInt(id[id.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function parseSaId(id: string): SaIdResult {
  const cleaned = id.trim();

  if (!/^\d{13}$/.test(cleaned)) {
    return { error: "ID number must be exactly 13 digits" };
  }

  if (!luhnCheck(cleaned)) {
    return { error: "ID number is invalid (checksum failed)" };
  }

  const yy = parseInt(cleaned.substring(0, 2));
  const mm = parseInt(cleaned.substring(2, 4));
  const dd = parseInt(cleaned.substring(4, 6));

  if (mm < 1 || mm > 12) {
    return { error: "ID number contains an invalid birth month" };
  }
  if (dd < 1 || dd > 31) {
    return { error: "ID number contains an invalid birth day" };
  }

  // Year disambiguation: <= 25 → 2000s, else 1900s
  const currentYY = getSASTNow().year % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;

  const dob = new Date(Date.UTC(year, mm - 1, dd));
  // Validate the date is real (e.g. not Feb 30)
  if (
    dob.getUTCMonth() !== mm - 1 ||
    dob.getUTCDate() !== dd
  ) {
    return { error: "ID number contains an invalid birth date" };
  }

  // Gender: sequence digits 6-9; 5000+ = MALE, 0-4999 = FEMALE
  const genderDigits = parseInt(cleaned.substring(6, 10));
  const gender: Gender = genderDigits >= 5000 ? "MALE" : "FEMALE";

  return { dob, gender };
}

export function calculateAge(dob: Date): number {
  const now = getSASTNow();
  let age = now.year - dob.getUTCFullYear();
  const monthDiff = now.month - (dob.getUTCMonth() + 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.day < dob.getUTCDate())) {
    age--;
  }
  return age;
}

export function getExpectedGrade(dob: Date): string {
  const grade = getSASTNow().year - dob.getUTCFullYear() - 6;
  if (grade < 1) return "Not yet school-going";
  if (grade > 12) return "Completed Grade 12";
  return `Grade ${grade}`;
}

export function getDivision(dob: Date): string {
  const ageThisYear = getSASTNow().year - dob.getUTCFullYear();
  if (ageThisYear <= 8)  return "U/8";
  if (ageThisYear <= 10) return "U/10";
  if (ageThisYear <= 12) return "U/12";
  if (ageThisYear <= 14) return "U/14";
  if (ageThisYear <= 16) return "U/16";
  if (ageThisYear <= 18) return "U/18";
  return "Open";
}

export function getDivisionLabel(dob: Date, gender: "MALE" | "FEMALE"): string {
  const division = getDivision(dob);
  if (division === "Open") return gender === "MALE" ? "Open Men" : "Open Women";
  return `${division} ${gender === "MALE" ? "Boys" : "Girls"}`;
}

export function formatDuration(from: Date, to: Date): string {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  let months = to.getUTCMonth() - from.getUTCMonth();
  let days = to.getUTCDate() - from.getUTCDate();
  if (days < 0) { months--; days += new Date(to.getUTCFullYear(), to.getUTCMonth(), 0).getUTCDate(); }
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years > 0) parts.push(years === 1 ? "1 year" : `${years} years`);
  if (months > 0) parts.push(months === 1 ? "1 month" : `${months} months`);
  return parts.length > 0 ? parts.join(" and ") : "0 months";
}

export function formatTenure(registrationDate: Date): string {
  const now = getSASTNow();
  let years = now.year - registrationDate.getUTCFullYear();
  let months = now.month - (registrationDate.getUTCMonth() + 1);

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) {
    return months === 1 ? "1 month" : `${months} months`;
  }
  const yearStr = years === 1 ? "1 year" : `${years} years`;
  if (months === 0) return yearStr;
  const monthStr = months === 1 ? "1 month" : `${months} months`;
  return `${yearStr}, ${monthStr}`;
}
