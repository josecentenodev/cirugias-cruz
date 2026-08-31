import type { ProcedureTypeRepository } from "@cirugias-cruz/application";
import { ProcedureType } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";

/**
 * ProcedureType is a plain Entity with no child state and no delete
 * method by design (ADR 0011) — this repository never exposes a delete
 * operation either.
 */
export class PrismaProcedureTypeRepository implements ProcedureTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ProcedureType | null> {
    const row = await this.prisma.procedureType.findUnique({ where: { id } });
    if (!row) {
      return null;
    }

    return ProcedureType.create({
      id: row.id,
      physicianId: row.physicianId,
      name: row.name,
      description: row.description ?? undefined,
      technique: row.technique ?? undefined,
    });
  }

  async save(procedureType: ProcedureType): Promise<void> {
    await this.prisma.procedureType.upsert({
      where: { id: procedureType.id },
      create: {
        id: procedureType.id,
        physicianId: procedureType.physicianId,
        name: procedureType.name,
        description: procedureType.description ?? undefined,
        technique: procedureType.technique ?? undefined,
      },
      update: {
        name: procedureType.name,
        description: procedureType.description ?? undefined,
        technique: procedureType.technique ?? undefined,
      },
    });
  }
}
