import type { SurgeryRepository } from "@cirugias-cruz/application";
import { Surgery, type ControlAttributes, type ControlAuthor } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";

/**
 * Loads/saves the whole Surgery aggregate — including its Controls and
 * participating-resident ids — as one unit. There is no ControlRepository
 * and no repository call for a Control on its own anywhere in this class;
 * see docs/architecture/application-layer-discovery.md §1.3/§3.
 */
export class PrismaSurgeryRepository implements SurgeryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Surgery | null> {
    const row = await this.prisma.surgery.findUnique({
      where: { id },
      include: { controls: true, participants: true },
    });
    if (!row) {
      return null;
    }

    return toSurgery(row);
  }

  async findByPhysicianId(physicianId: string): Promise<Surgery[]> {
    const rows = await this.prisma.surgery.findMany({
      where: { physicianId },
      include: { controls: true, participants: true },
    });
    return rows.map(toSurgery);
  }

  async findByResidentId(residentId: string): Promise<Surgery[]> {
    const rows = await this.prisma.surgery.findMany({
      where: { participants: { some: { residentId } } },
      include: { controls: true, participants: true },
    });
    return rows.map(toSurgery);
  }

  async save(surgery: Surgery): Promise<void> {
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
    ]);
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
  }[];
  participants: { residentId: string }[];
}): Surgery {
  const controls: ControlAttributes[] = row.controls.map((control) => ({
    id: control.id,
    observations: control.observations,
    recordedAt: control.recordedAt,
    author: toControlAuthor(control),
  }));

  return Surgery.reconstitute({
    id: row.id,
    physicianId: row.physicianId,
    patientId: row.patientId,
    procedureTypeId: row.procedureTypeId,
    performedAt: row.performedAt,
    controls,
    participatingResidentIds: row.participants.map((participant) => participant.residentId),
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
