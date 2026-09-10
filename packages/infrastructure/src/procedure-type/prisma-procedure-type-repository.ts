import type { ProcedureTypeRepository } from "@cirugias-cruz/application";
import { ProcedureType } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";
import {
  fromControlDefinitionRow,
  fromCustomFieldDefinitionRow,
  toControlDefinitionRow,
  toCustomFieldDefinitionRow,
  type ControlDefinitionRow,
  type CustomFieldDefinitionRow,
} from "../shared/custom-field-mapping.js";

/**
 * ProcedureType is a plain Entity with no delete method by design (ADR
 * 0011) — this repository never exposes a delete operation either. It
 * loads/saves the whole aggregate, including its CustomField definitions
 * (ADR 0018) and its control definitions (ADR 0026) — there is no
 * repository for either child on its own, mirroring
 * SurgeryRepository/Control.
 *
 * ADR 0027 makes the scheme editable: `save` reconciles both child
 * collections by upserting what the aggregate now holds and deleting rows
 * it no longer holds.
 */
export class PrismaProcedureTypeRepository implements ProcedureTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ProcedureType | null> {
    const row = await this.prisma.procedureType.findUnique({
      where: { id },
      include: { customFields: true, controlDefinitions: true },
    });
    if (!row) {
      return null;
    }

    return toProcedureType(row);
  }

  async findByPhysicianId(physicianId: string): Promise<ProcedureType[]> {
    const rows = await this.prisma.procedureType.findMany({
      where: { physicianId },
      include: { customFields: true, controlDefinitions: true },
    });
    return rows.map(toProcedureType);
  }

  async save(procedureType: ProcedureType): Promise<void> {
    const customFieldIds = procedureType.customFields.map((field) => field.id);
    const controlDefinitionIds = procedureType.controlDefinitions.map(
      (definition) => definition.id,
    );

    await this.prisma.$transaction([
      this.prisma.procedureType.upsert({
        where: { id: procedureType.id },
        create: {
          id: procedureType.id,
          physicianId: procedureType.physicianId,
          name: procedureType.name,
          description: procedureType.description ?? undefined,
        },
        update: {
          name: procedureType.name,
          description: procedureType.description ?? undefined,
        },
      }),
      // Drop definitions the aggregate no longer holds (ADR 0027 remove).
      // The Application layer has already verified none are in use.
      this.prisma.customFieldDefinition.deleteMany({
        where: { procedureTypeId: procedureType.id, id: { notIn: customFieldIds } },
      }),
      this.prisma.controlDefinition.deleteMany({
        where: { procedureTypeId: procedureType.id, id: { notIn: controlDefinitionIds } },
      }),
      ...procedureType.customFields.map((field) => {
        const row = toCustomFieldDefinitionRow(field, procedureType.id);
        return this.prisma.customFieldDefinition.upsert({
          where: { id: field.id },
          create: row,
          update: row,
        });
      }),
      ...procedureType.controlDefinitions.map((definition) => {
        const row = toControlDefinitionRow(definition, procedureType.id);
        return this.prisma.controlDefinition.upsert({
          where: { id: definition.id },
          create: row,
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
  customFields: CustomFieldDefinitionRow[];
  controlDefinitions: ControlDefinitionRow[];
}): ProcedureType {
  return ProcedureType.reconstitute({
    id: row.id,
    physicianId: row.physicianId,
    name: row.name,
    description: row.description ?? undefined,
    customFields: row.customFields.map(fromCustomFieldDefinitionRow),
    controlDefinitions: row.controlDefinitions.map(fromControlDefinitionRow),
  });
}
