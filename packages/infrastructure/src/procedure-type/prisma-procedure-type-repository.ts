import type { ProcedureTypeRepository } from "@cirugias-cruz/application";
import { ProcedureType } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";
import {
  fromCustomFieldDefinitionRow,
  toCustomFieldDefinitionRow,
  type CustomFieldDefinitionRow,
} from "../shared/custom-field-mapping.js";

/**
 * ProcedureType is a plain Entity with no delete method by design (ADR
 * 0011) — this repository never exposes a delete operation either. It
 * loads/saves the whole aggregate, including its CustomField definitions
 * (ADR 0018) — there is no repository for a CustomFieldDefinition on its
 * own, mirroring SurgeryRepository/Control.
 */
export class PrismaProcedureTypeRepository implements ProcedureTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ProcedureType | null> {
    const row = await this.prisma.procedureType.findUnique({
      where: { id },
      include: { customFields: true },
    });
    if (!row) {
      return null;
    }

    return toProcedureType(row);
  }

  async findByPhysicianId(physicianId: string): Promise<ProcedureType[]> {
    const rows = await this.prisma.procedureType.findMany({
      where: { physicianId },
      include: { customFields: true },
    });
    return rows.map(toProcedureType);
  }

  async save(procedureType: ProcedureType): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.procedureType.upsert({
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
      }),
      ...procedureType.customFields.map((field) => {
        const row = toCustomFieldDefinitionRow(field, procedureType.id);
        return this.prisma.customFieldDefinition.upsert({
          where: { id: field.id },
          create: row,
          // CustomField definitions are add-only from Application's point
          // of view today (ProcedureType.addCustomField, no edit/remove) —
          // this update branch only exists so upsert is idempotent on
          // retries, not because definitions are expected to change.
          update: row,
        });
      }),
    ]);
  }
}

function toProcedureType(row: {
  id: string;
  physicianId: string;
  name: string;
  description: string | null;
  technique: string | null;
  customFields: CustomFieldDefinitionRow[];
}): ProcedureType {
  return ProcedureType.reconstitute({
    id: row.id,
    physicianId: row.physicianId,
    name: row.name,
    description: row.description ?? undefined,
    technique: row.technique ?? undefined,
    customFields: row.customFields.map(fromCustomFieldDefinitionRow),
  });
}
