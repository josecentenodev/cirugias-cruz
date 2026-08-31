import type { PhysicianRepository } from "@cirugias-cruz/application";
import { Physician } from "@cirugias-cruz/domain";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Physician is a plain Entity with no child state — `create()` is reused directly for hydration. */
export class PrismaPhysicianRepository implements PhysicianRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Physician | null> {
    const row = await this.prisma.physician.findUnique({ where: { id } });
    if (!row) {
      return null;
    }

    return Physician.create({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    });
  }

  async save(physician: Physician): Promise<void> {
    await this.prisma.physician.upsert({
      where: { id: physician.id },
      create: {
        id: physician.id,
        firstName: physician.firstName,
        lastName: physician.lastName,
        phone: physician.phone,
        email: physician.email,
        dateOfBirth: physician.dateOfBirth,
        metadata: (physician.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
      update: {
        firstName: physician.firstName,
        lastName: physician.lastName,
        phone: physician.phone,
        email: physician.email,
        dateOfBirth: physician.dateOfBirth,
        metadata: (physician.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }
}
