/**
 * Seed script for the SuperSats demo environment.
 * Run once to create seed.db, then copy it as app.db on the demo server.
 *
 * Usage:
 *   DATABASE_URL="file:./seed.db" npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Realistic South African names for demo participants
const PARTICIPANTS = [
  { surname: "Dube",     fullNames: "Lethiwe",   knownAs: "Lethi",  gender: "FEMALE", dob: "2010-03-15", group: "TURTLES",      status: "Turtle L1" },
  { surname: "Nkosi",    fullNames: "Sipho",      knownAs: null,     gender: "MALE",   dob: "2009-07-22", group: "TURTLES",      status: "Turtle L2" },
  { surname: "van Wyk",  fullNames: "Jade",       knownAs: "J",      gender: "FEMALE", dob: "2008-11-04", group: "SEALS",        status: "Seal L3"   },
  { surname: "Botha",    fullNames: "Ruan",       knownAs: null,     gender: "MALE",   dob: "2008-05-18", group: "SEALS",        status: "Seal L4"   },
  { surname: "Dlamini",  fullNames: "Thabo",      knownAs: "T",      gender: "MALE",   dob: "2007-09-30", group: "DOLPHINS",     status: "Dolphin L5"},
  { surname: "Petersen", fullNames: "Aisha",      knownAs: null,     gender: "FEMALE", dob: "2007-02-14", group: "DOLPHINS",     status: "Dolphin L6"},
  { surname: "Jacobs",   fullNames: "Kyle",       knownAs: null,     gender: "MALE",   dob: "2006-08-01", group: "SHARKS",       status: "Shark L7"  },
  { surname: "Hendricks",fullNames: "Tamzin",     knownAs: "Tamz",   gender: "FEMALE", dob: "2006-12-20", group: "SHARKS",       status: "Shark L7"  },
  { surname: "Adams",    fullNames: "Zaid",       knownAs: null,     gender: "MALE",   dob: "2005-04-09", group: "FREE_SURFERS", status: "Free Surfer"},
  { surname: "Isaacs",   fullNames: "Mikayla",    knownAs: "Mika",   gender: "FEMALE", dob: "2005-06-27", group: "FREE_SURFERS", status: "Free Surfer"},
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d;
}

// Fake SA ID: not Luhn-valid but unique — only used internally, never shown in demo
function fakeId(index: number): string {
  return `000101${String(index).padStart(4, "0")}0800${index % 10}`;
}

async function main() {
  console.log("Seeding demo database...");

  // Reward settings
  await prisma.rewardSettings.create({
    data: {
      minSats: 5_000,
      maxSats: 21_000,
      effectiveFrom: monthsAgo(6),
      createdBy: "demo-admin",
    },
  });

  // Create participants
  const created: { id: string; group: string }[] = [];
  for (let i = 0; i < PARTICIPANTS.length; i++) {
    const p = PARTICIPANTS[i];
    const participant = await prisma.participant.create({
      data: {
        tskId: `SS-${String(i + 1).padStart(3, "0")}`,
        surname: p.surname,
        fullNames: p.fullNames,
        knownAs: p.knownAs,
        gender: p.gender as "MALE" | "FEMALE",
        idNumber: fakeId(i + 1),
        dateOfBirth: new Date(p.dob),
        tskStatus: p.status,
        boltUserId: `demo-user-${String(i + 1).padStart(3, "0")}`,
        paymentMethod: "BOLT_CARD",
        registrationDate: monthsAgo(3 - (i % 3)),
        ethnicity: ["Black", "Coloured", "White"][i % 3],
        school: ["Muizenberg High School", "Fish Hoek High", "SACS"][i % 3],
        status: "ACTIVE",
      },
    });
    created.push({ id: participant.id, group: p.group });
  }

  // Create events: 4 past events in current month, 4 in previous month
  const events: { id: string; date: Date; group: string }[] = [];
  const groups = ["TURTLES", "SEALS", "DOLPHINS", "SHARKS", "FREE_SURFERS"] as const;
  const categories = ["SURFING", "FITNESS", "BEACH_ACTIVITIES", "SURFING"] as const;

  for (const group of groups) {
    for (let w = 0; w < 4; w++) {
      // Current month: 1, 8, 15, 22 days ago
      const ev = await prisma.event.create({
        data: {
          date: daysAgo(1 + w * 7),
          category: categories[w % categories.length],
          group: group as any,
          createdBy: "demo-admin",
        },
      });
      events.push({ id: ev.id, date: ev.date, group });
    }
  }

  // Create attendance records — ~70% attendance for pre-existing participants
  for (const ev of events) {
    const groupParticipants = created.filter((p) => p.group === ev.group);
    for (let i = 0; i < groupParticipants.length; i++) {
      const present = i % 3 !== 2; // ~67% present
      await prisma.attendanceRecord.create({
        data: {
          participantId: groupParticipants[i].id,
          eventId: ev.id,
          present,
          onTour: false,
        },
      });
    }
  }

  console.log(
    `Done. Created ${PARTICIPANTS.length} participants, ${events.length} events.`
  );
  console.log("Now run: cp seed.db app.db  (and commit seed.db to the server)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
