import type { SurgeryRepository } from "@cirugias-cruz/application";
import { Surgery, type ControlAttributes, type ControlAuthor } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";
import {
  fromCustomFieldValueRow,
  toCustomFieldValueColumns,
  type CustomFieldValueRow,
} from "../shared/custom-field-mapping.js";

/**
 * Loads/saves the whole Surgery aggregate — including its Controls,
 * participating-resident ids, and CustomField values (ADR 0018) — as one
 * unit. There is no ControlRepository and no repository call for a
 * Control on its own anywhere in this class; see
 * docs/architecture/application-layer-discovery.md §1.3/§3. CustomField
 * *values* follow the same rule: only ProcedureTypeRepository/
 * SurgeryRepository ever write to `custom_field_values`.
 */
export class PrismaSurgeryRepository implements SurgeryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Surgery | null> {
    const row = await this.prisma.surgery.findUnique({
      where: { id },
      include: {
        controls: { include: { customFieldValues: true } },
        participants: true,
        customFieldValues: true,
      },
    });
    if (!row) {
      return null;
    }

    return toSurgery(row);
  }

  async findByPhysicianId(physicianId: string): Promise<Surgery[]> {
    const rows = await this.prisma.surgery.findMany({
      where: { physicianId },
      include: {
        controls: { include: { customFieldValues: true } },
        participants: true,
        customFieldValues: true,
      },
    });
    return rows.map(toSurgery);
  }

  async findByResidentId(residentId: string): Promise<Surgery[]> {
    const rows = await this.prisma.surgery.findMany({
      where: { participants: { some: { residentId } } },
      include: {
        controls: { include: { customFieldValues: true } },
        participants: true,
        customFieldValues: true,
      },
    });
    return rows.map(toSurgery);
  }

  async save(surgery: Surgery): Promise<void> {
    const definitionIds = new Set<string>([
      ...surgery.customFieldValues.map((value) => value.definitionId),
      ...surgery.controls.flatMap((control) =>
        control.customFieldValues.map((value) => value.definitionId),
      ),
    ]);
    const valueTypeByDefinitionId = await this.loadValueTypes(definitionIds);

    await this.prisma.$transaction([
      this.prisma.surgery.upsert({
        where: { id: surgery.id },
        create: {
          id: surgery.id,
          physicianId: surgery.physicianId,
          patientId: surgery.patientId,
          procedureTypeId: surgery.procedureTypeId,
          performedAt: surgery.performedAt,
        },
        update: {
          procedureTypeId: surgery.procedureTypeId,
          performedAt: surgery.performedAt,
        },
      }),
      ...surgery.controls.map((control) => {
        const authorColumns = fromControlAuthor(control.author);
        return this.prisma.control.upsert({
          where: { id: control.id },
          create: {
            id: control.id,
            surgeryId: surgery.id,
            observations: control.observations,
            recordedAt: control.recordedAt,
            ...authorColumns,
          },
          update: {
            observations: control.observations,
            recordedAt: control.recordedAt,
          },
        });
      }),
      this.prisma.surgeryParticipant.deleteMany({ where: { surgeryId: surgery.id } }),
      this.prisma.surgeryParticipant.createMany({
        data: surgery.participatingResidentIds.map((residentId) => ({
          surgeryId: surgery.id,
          residentId,
        })),
      }),
      ...surgery.customFieldValues.map((value) =>
        this.prisma.customFieldValue.upsert({
          where: { id: `${surgery.id}:${value.definitionId}` },
          create: {
            id: `${surgery.id}:${value.definitionId}`,
            definitionId: value.definitionId,
            surgeryId: surgery.id,
            ...toCustomFieldValueColumns(
              value,
              valueTypeByDefinitionId.get(value.definitionId) ?? "",
            ),
          },
          update: toCustomFieldValueColumns(
            value,
            valueTypeByDefinitionId.get(value.definitionId) ?? "",
          ),
        }),
      ),
      ...surgery.controls.flatMap((control) =>
        control.customFieldValues.map((value) =>
          this.prisma.customFieldValue.upsert({
            where: { id: `${control.id}:${value.definitionId}` },
            create: {
              id: `${control.id}:${value.definitionId}`,
              definitionId: value.definitionId,
              controlId: control.id,
              ...toCustomFieldValueColumns(
                value,
                valueTypeByDefinitionId.get(value.definitionId) ?? "",
              ),
            },
            update: toCustomFieldValueColumns(
              value,
              valueTypeByDefinitionId.get(value.definitionId) ?? "",
            ),
          }),
        ),
      ),
    ]);
  }

  private async loadValueTypes(definitionIds: Set<string>): Promise<Map<string, string>> {
    if (definitionIds.size === 0) {
      return new Map();
    }
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { id: { in: [...definitionIds] } },
      select: { id: true, valueType: true },
    });
    return new Map(definitions.map((definition) => [definition.id, definition.valueType]));
  }
}

function toSurgery(row: {
  id: string;
  physicianId: string;
  patientId: string;
  procedureTypeId: string;
  performedAt: Date;
  controls: {
    id: string;
    observations: string;
    recordedAt: Date;
    authorType: string;
    authorPhysicianId: string | null;
    authorResidentId: string | null;
    customFieldValues: CustomFieldValueRow[];
  }[];
  participants: { residentId: string }[];
  customFieldValues: CustomFieldValueRow[];
}): Surgery {
  const controls: ControlAttributes[] = row.controls.map((control) => ({
    id: control.id,
    observations: control.observations,
    recordedAt: control.recordedAt,
    author: toControlAuthor(control),
    customFieldValues: control.customFieldValues.map(fromCustomFieldValueRow),
  }));

  return Surgery.reconstitute({
    id: row.id,
    physicianId: row.physicianId,
    patientId: row.patientId,
    procedureTypeId: row.procedureTypeId,
    performedAt: row.performedAt,
    controls,
    participatingResidentIds: row.participants.map((participant) => participant.residentId),
    customFieldValues: row.customFieldValues.map(fromCustomFieldValueRow),
  });
}

function toControlAuthor(control: {
  authorType: string;
  authorPhysicianId: string | null;
  authorResidentId: string | null;
}): ControlAuthor {
  if (control.authorType === "physician") {
    if (!control.authorPhysicianId) {
      throw new Error(`Corrupt control row: physician-authored control missing authorPhysicianId`);
    }
    return { type: "physician", physicianId: control.authorPhysicianId };
  }

  if (control.authorType === "resident") {
    if (!control.authorResidentId) {
      throw new Error(`Corrupt control row: resident-authored control missing authorResidentId`);
    }
    return { type: "resident", residentId: control.authorResidentId };
  }

  throw new Error(`Corrupt control row: unknown authorType "${control.authorType}"`);
}

function fromControlAuthor(author: ControlAuthor): {
  authorType: string;
  authorPhysicianId: string | null;
  authorResidentId: string | null;
} {
  if (author.type === "physician") {
    return {
      authorType: "physician",
      authorPhysicianId: author.physicianId,
      authorResidentId: null,
    };
  }
  return { authorType: "resident", authorPhysicianId: null, authorResidentId: author.residentId };
}
