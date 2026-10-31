import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI de Prisma (migrate, studio) usa DIRECT_URL (session pooler, puerto 5432).
// La aplicación en ejecución usa DATABASE_URL (transaction pooler, 6543) desde src/config/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DIRECT_URL"] ?? "" },
});
