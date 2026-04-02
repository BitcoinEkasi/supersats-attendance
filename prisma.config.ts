import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Use process.env directly (not Prisma's env() helper) so the config loads
    // without DATABASE_URL present at build time. prisma generate does not
    // connect to the database, so the fallback is never actually used.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
