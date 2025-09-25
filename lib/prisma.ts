// lib/prisma.ts
import { PrismaClient } from "./generated/prisma";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["query"], // optional, helps with debugging
  });

// Prevent multiple instances in dev (Next.js hot reload)
if (process.env.NODE_ENV !== "production") global.prisma = prisma;
