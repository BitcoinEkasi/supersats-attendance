import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { calculateAge, getDivisionLabel, formatTenure, formatDuration } from "@/lib/sa-id";
import { fmtDate, MONTHS } from "@/lib/format-date";
import { fmtPct } from "@/lib/rewards";
import { getAcMultiplier } from "@/lib/tsk-levels";
import { TSK_GROUP_LABELS, groupSortIndex } from "@/lib/tsk-groups";

const PHOTO_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type AbsenceBadgeEntry = {
  participantId: string;
  surname: string;
  fullNames: string;
  knownAs: string | null;
  consecutiveMissed: number;
  name: string;
  tskId: string;
  levelLine: string;
  bornLine: string;
  tenureLine: string;
  tenureIsRetired: boolean;
  contactLine: string | null;
  trendLine: string | null;
  photoDataUri: string | null;
  initial: string;
};

type AbsenceBadgeGroup = { group: string | null; label: string; entries: AbsenceBadgeEntry[] };

async function resolvePhotoDataUri(profilePicture: string | null): Promise<string | null> {
  if (!profilePicture || !profilePicture.startsWith("/uploads/")) return null;
  const ext = profilePicture.split(".").pop()?.toLowerCase() ?? "";
  const mime = PHOTO_MIME[ext];
  if (!mime) return null;
  try {
    const buf = await readFile(join(process.cwd(), "public", profilePicture));
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Grouped, print-ready view of every currently flagged AbsenceFlag participant.
 *  Shared by the dashboard PDF export and the TSK Pulse email attachment so both
 *  render from exactly the same data. */
export async function getAbsenceBadgeGroups(): Promise<AbsenceBadgeGroup[]> {
  const flags = await prisma.absenceFlag.findMany({
    include: {
      participant: {
        select: {
          id: true, tskId: true, surname: true, fullNames: true, knownAs: true,
          profilePicture: true, tskStatus: true, isAssistantCoach: true, assistantCoachSince: true,
          dateOfBirth: true, gender: true, stance: true,
          registrationDate: true, status: true, retiredAt: true, retiredReason: true, retiredReasonOther: true,
          contact1: true, contact2: true, address: true,
        },
      },
    },
  });

  if (flags.length === 0) return [];

  const participantIds = flags.map((f) => f.participantId);
  const recentEntries = await prisma.monthlyReportEntry.findMany({
    where: { participantId: { in: participantIds } },
    include: { report: { select: { month: true } } },
    orderBy: { report: { month: "desc" } },
  });
  const entriesByParticipant = new Map<string, { month: string; percentage: number }[]>();
  for (const e of recentEntries) {
    const list = entriesByParticipant.get(e.participantId) ?? [];
    if (list.length < 3) list.push({ month: e.report.month, percentage: Number(e.percentage) });
    entriesByParticipant.set(e.participantId, list);
  }

  const reportMonthLabel = (yearMonth: string) => MONTHS[parseInt(yearMonth.split("-")[1], 10) - 1];

  const entries: (AbsenceBadgeEntry & { group: string | null })[] = await Promise.all(
    flags.map(async (f) => {
      const p = f.participant;
      const name = p.knownAs ? `${p.surname}, ${p.fullNames} (${p.knownAs})` : `${p.surname}, ${p.fullNames}`;

      const acSuffix = p.isAssistantCoach && p.assistantCoachSince
        ? ` AC${getAcMultiplier(p.assistantCoachSince, new Date().toISOString().slice(0, 7))}`
        : "";
      const levelLine = `${p.tskId} · ${p.tskStatus ?? "—"}${acSuffix}`;

      const bornLine = [
        `Born ${fmtDate(p.dateOfBirth)}`,
        `Age ${calculateAge(p.dateOfBirth)}`,
        getDivisionLabel(p.dateOfBirth, p.gender),
        p.stance ? `Stance ${p.stance}` : null,
      ].filter(Boolean).join(" · ");

      let tenureLine: string;
      let tenureIsRetired = false;
      if (p.status === "ACTIVE") {
        tenureLine = `Active from ${fmtDate(p.registrationDate)}, ${formatTenure(p.registrationDate)}`;
      } else if (p.retiredAt) {
        tenureIsRetired = true;
        const reason = p.retiredReason === "Other" ? (p.retiredReasonOther || "Other") : p.retiredReason;
        tenureLine = `Joined ${fmtDate(p.registrationDate)} · Retired on ${fmtDate(p.retiredAt)}${reason ? ` — ${reason}` : ""} · after ${formatDuration(p.registrationDate, p.retiredAt)}`;
      } else {
        tenureLine = `Joined ${fmtDate(p.registrationDate)}`;
      }

      const contactParts = [p.contact1, p.contact2].filter(Boolean).join(" / ");
      const contactLine = contactParts || p.address
        ? [contactParts || null, p.address || null].filter(Boolean).join(" · ")
        : null;

      const trend = (entriesByParticipant.get(p.id) ?? []).slice().reverse();
      const trendLine = [
        trend.length > 0 ? trend.map((t) => `${reportMonthLabel(t.month)} ${fmtPct(t.percentage)}`).join(", ") : null,
        `${f.consecutiveMissed} consecutive ${f.consecutiveMissed === 1 ? "absence" : "absences"}`,
      ].filter(Boolean).join(" · ");

      return {
        participantId: p.id,
        surname: p.surname,
        fullNames: p.fullNames,
        knownAs: p.knownAs,
        consecutiveMissed: f.consecutiveMissed,
        name,
        tskId: p.tskId,
        levelLine,
        bornLine,
        tenureLine,
        tenureIsRetired,
        contactLine,
        trendLine,
        photoDataUri: await resolvePhotoDataUri(p.profilePicture),
        initial: (p.knownAs || p.surname).charAt(0).toUpperCase(),
        group: f.group,
      };
    }),
  );

  const byGroup = new Map<string | null, AbsenceBadgeEntry[]>();
  for (const e of entries) {
    const list = byGroup.get(e.group) ?? [];
    list.push(e);
    byGroup.set(e.group, list);
  }
  for (const list of byGroup.values()) list.sort((a, b) => b.consecutiveMissed - a.consecutiveMissed);

  return [...byGroup.keys()]
    .sort((a, b) => groupSortIndex(a) - groupSortIndex(b))
    .map((group) => ({
      group,
      label: group ? (TSK_GROUP_LABELS[group] ?? group) : "Unassigned",
      entries: byGroup.get(group) ?? [],
    }));
}
