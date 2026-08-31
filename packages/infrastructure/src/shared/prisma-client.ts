import { PrismaClient } from "@prisma/client";

/**
 * A single shared Prisma client. No Unit-of-Work abstraction sits on top
 * of this — each repository's `save()` uses `prisma.$transaction` directly
 * for the one operation that genuinely needs multi-table atomicity
 * (SurgeryRepository.save), and nothing else in this milestone needs more
 * than that.
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
