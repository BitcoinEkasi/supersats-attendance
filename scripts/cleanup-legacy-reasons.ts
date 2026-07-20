import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const RETIRED_REASONS = ["Coach/Marshal Unavailable", "Attendance Capturing Skipped", "Other"];

async function main() {
  const result = await prisma.excusedSession.deleteMany({
    where: { reason: { in: RETIRED_REASONS } },
  });
  console.log(`Deleted ${result.count} ExcusedSession row(s) with a retired reason.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
