import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Use $extends for potential serverless optimisations
export const prisma =
  globalForPrisma.prisma || new PrismaClient().$extends({})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Gracefully disconnect Prisma when the process exits
process.on("beforeExit", async () => {
  await prisma.$disconnect()
})
