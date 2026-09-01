import type { ResidentRepository } from "@cirugias-cruz/application";
import { Resident } from "@cirugias-cruz/domain";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Resident is a plain Entity with no child state (mirrors
 * PrismaPatientRepository) — every field Resident.create() accepts is
 * exactly what's stored, so create() is reused directly for hydration.
 */
export class PrismaResidentRepository implements ResidentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Resident | null> {
    const row = await this.prisma.resident.findUnique({ where: { id } });
    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async findByPhysicianId(physicianId: string): Promise<Resident[]> {
    const rows = await this.prisma.resident.findMany({ where: { physicianId } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(resident: Resident): Promise<void> {
    await this.prisma.resident.upsert({
      where: { id: resident.id },
      create: {
        id: resident.id,
        physicianId: resident.physicianId,
        firstName: resident.firstName,
        lastName: resident.lastName,
        phone: resident.phone,
        email: resident.email,
        dateOfBirth: resident.dateOfBirth,
        metadata: (resident.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
      update: {
        firstName: resident.firstName,
        lastName: resident.lastName,
        phone: resident.phone,
        email: resident.email,
        dateOfBirth: resident.dateOfBirth,
        metadata: (resident.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }

  private toDomain(row: {
    id: string;
    physicianId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: Date;
    metadata: Prisma.JsonValue | null;
  }): Resident {
    return Resident.create({
      id: row.id,
      physicianId: row.physicianId,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    });
  }
}
