import type { PatientRepository } from "@cirugias-cruz/application";
import { Patient } from "@cirugias-cruz/domain";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Patient is a plain Entity with no child state (see
 * docs/architecture/application-layer-discovery.md §1.6) — every field
 * `Patient.create()` accepts is exactly what's stored, so `create()` is
 * reused directly for hydration. No `reconstitute()` is needed here.
 */
export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Patient | null> {
    const row = await this.prisma.patient.findUnique({ where: { id } });
    if (!row) {
      return null;
    }

    return Patient.create({
      id: row.id,
      physicianId: row.physicianId,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      observations: row.observations ?? undefined,
    });
  }

  async save(patient: Patient): Promise<void> {
    await this.prisma.patient.upsert({
      where: { id: patient.id },
      create: {
        id: patient.id,
        physicianId: patient.physicianId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        metadata: (patient.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        observations: patient.observations ?? undefined,
      },
      update: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        metadata: (patient.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        observations: patient.observations ?? undefined,
      },
    });
  }
}
