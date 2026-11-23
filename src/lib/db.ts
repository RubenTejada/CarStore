import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// La base de producción (nexconta-db-b, B1ms) admite 50 conexiones para todas sus apps.
// El build de Next incluye este módulo en más de un chunk de servidor (páginas y rutas /api);
// sin el singleton en globalThis cada copia abría su propio pool de 10, y en las horas de
// tráfico el servidor se quedaba sin conexiones (P2037, TooManyConnections).
const POOL_SIZE = 5;

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: POOL_SIZE });
  return new PrismaClient({ adapter });
}

export const db = (globalForPrisma.prisma ??= createClient());
