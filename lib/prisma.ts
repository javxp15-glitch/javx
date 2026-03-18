import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

// Allow BigInt to be serialized as JSON (returned as Number for values within safe range)
// This is needed because Prisma returns BigInt for BigInt columns,
// but JSON.stringify() doesn't support BigInt natively
if (typeof BigInt !== "undefined" && !(BigInt.prototype as unknown as { toJSON?: unknown }).toJSON) {
  ;(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
    return Number(this)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof makePrisma> | undefined
}

function makePrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma ?? makePrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
