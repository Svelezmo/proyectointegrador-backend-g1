import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

/**
 * Cliente único de Prisma. Solo los repositorios (capa de infraestructura) lo importan;
 * services, entidades y controladores nunca dependen de Prisma directamente.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 5,
});

export const prisma = new PrismaClient({ adapter });

export async function verificarBaseDeDatos(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
