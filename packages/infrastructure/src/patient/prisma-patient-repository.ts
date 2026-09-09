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

    return toPatient(row);
  }

  async findByPhysicianId(physicianId: string, query?: string): Promise<Patient[]> {
    const q = query?.trim();
    const rows = await this.prisma.patient.findMany({
      where: q
        ? {
            physicianId,
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { dni: { contains: q, mode: "insensitive" } },
            ],
          }
        : { physicianId },
    });
    return rows.map(toPatient);
  }

  async findByDni(physicianId: string, dni: string): Promise<Patient | null> {
    const row = await this.prisma.patient.findFirst({ where: { physicianId, dni } });
    return row ? toPatient(row) : null;
  }

  async save(patient: Patient): Promise<void> {
    await this.prisma.patient.upsert({
      where: { id: patient.id },
      create: {
        id: patient.id,
        physicianId: patient.physicianId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        dni: patient.dni ?? null,
        metadata: (patient.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        observations: patient.observations ?? undefined,
      },
      update: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        dni: patient.dni ?? null,
        metadata: (patient.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        observations: patient.observations ?? undefined,
      },
    });
  }
}

function toPatient(row: {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  dni: string | null;
  metadata: Prisma.JsonValue | null;
  observations: string | null;
}): Patient {
  return Patient.create({
    id: row.id,
    physicianId: row.physicianId,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    dni: row.dni ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    observations: row.observations ?? undefined,
  });
}
