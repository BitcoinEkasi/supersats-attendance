import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      name: "Administrator",
      passwordHash: adminHash,
      role: "ADMINISTRATOR",
    },
  });
  console.log(`Seeded administrator: ${admin.username}`);

  const marshallUsername = process.env.MARSHALL_USERNAME || "marshall";
  const marshallPassword = process.env.MARSHALL_PASSWORD || "marshall123";
  const marshallHash = await bcrypt.hash(marshallPassword, 12);
  const marshall = await prisma.user.upsert({
    where: { username: marshallUsername },
    update: {},
    create: {
      username: marshallUsername,
      name: "Marshall",
      passwordHash: marshallHash,
      role: "MARSHALL",
    },
  });
  console.log(`Seeded marshall: ${marshall.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
