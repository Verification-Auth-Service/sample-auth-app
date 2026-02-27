import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const resourceDatabaseUrl = process.env.RESOURCE_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resourceDatabaseUrl || env("DATABASE_URL"),
  },
});
