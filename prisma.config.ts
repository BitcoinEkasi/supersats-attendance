import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  migrate: {
    migrations: "./prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
