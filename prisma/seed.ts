import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tsk.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash: adminHash,
      role: "ADMINISTRATOR",
    },
  });
  console.log(`Seeded administrator: ${admin.email}`);

  const gatekeeperEmail = process.env.GATEKEEPER_EMAIL || "gatekeeper@tsk.local";
  const gatekeeperPassword = process.env.GATEKEEPER_PASSWORD || "gatekeeper123";
  const gatekeeperHash = await bcrypt.hash(gatekeeperPassword, 12);
  const gatekeeper = await prisma.user.upsert({
    where: { email: gatekeeperEmail },
    update: {},
    create: {
      email: gatekeeperEmail,
      name: "Gatekeeper",
      passwordHash: gatekeeperHash,
      role: "GATEKEEPER",
    },
  });
  console.log(`Seeded gatekeeper: ${gatekeeper.email}`);

  const supervisorEmail = process.env.SUPERVISOR_EMAIL || "supervisor@tsk.local";
  const supervisorPassword = process.env.SUPERVISOR_PASSWORD || "supervisor123";
  const supervisorHash = await bcrypt.hash(supervisorPassword, 12);
  const supervisor = await prisma.user.upsert({
    where: { email: supervisorEmail },
    update: {},
    create: {
      email: supervisorEmail,
      name: "Supervisor",
      passwordHash: supervisorHash,
      role: "SUPERVISOR",
    },
  });
  console.log(`Seeded supervisor: ${supervisor.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
