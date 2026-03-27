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

  const marshallEmail = process.env.MARSHALL_EMAIL || "marshall@tsk.local";
  const marshallPassword = process.env.MARSHALL_PASSWORD || "marshall123";
  const marshallHash = await bcrypt.hash(marshallPassword, 12);
  const marshall = await prisma.user.upsert({
    where: { email: marshallEmail },
    update: {},
    create: {
      email: marshallEmail,
      name: "Marshall",
      passwordHash: marshallHash,
      role: "MARSHALL",
    },
  });
  console.log(`Seeded marshall: ${marshall.email}`);

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
