import type { ResearchStudyRepository } from "@cirugias-cruz/application";
import { ResearchStudy, type ResearchStudyStatus } from "@cirugias-cruz/domain";
import type { PrismaClient } from "@prisma/client";

/**
 * Uses `ResearchStudy.reconstitute(...)` (mirrors `Surgery.reconstitute`)
 * to rebuild the aggregate directly from persisted state — status and
 * surgeryIds included — without replaying `addSurgery`/
 * `moveToInProgress`/`complete`. Those methods validate *new* transitions
 * a caller is making now; hydration is not a new transition, it's
 * restoring state already validated once, on write.
 */
export class PrismaResearchStudyRepository implements ResearchStudyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ResearchStudy | null> {
    const row = await this.prisma.researchStudy.findUnique({
      where: { id },
      include: { surgeries: true },
    });
    if (!row) {
      return null;
    }

    return reconstitute(row);
  }

  async findByPhysicianId(physicianId: string): Promise<ResearchStudy[]> {
    const rows = await this.prisma.researchStudy.findMany({
      where: { physicianId },
      include: { surgeries: true },
    });

    return rows.map(reconstitute);
  }

  async save(study: ResearchStudy): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.researchStudy.upsert({
        where: { id: study.id },
        create: {
          id: study.id,
          physicianId: study.physicianId,
          hypothesis: study.hypothesis ?? undefined,
          results: study.results ?? undefined,
          analysis: study.analysis ?? undefined,
          conclusion: study.conclusion ?? undefined,
          status: study.status,
        },
        update: {
          hypothesis: study.hypothesis ?? null,
          results: study.results ?? null,
          analysis: study.analysis ?? null,
          conclusion: study.conclusion ?? null,
          status: study.status,
        },
      }),
      this.prisma.researchStudySurgery.deleteMany({ where: { researchStudyId: study.id } }),
      this.prisma.researchStudySurgery.createMany({
        data: study.surgeryIds.map((surgeryId) => ({
          researchStudyId: study.id,
          surgeryId,
        })),
      }),
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.researchStudySurgery.deleteMany({ where: { researchStudyId: id } }),
      this.prisma.researchStudy.deleteMany({ where: { id } }),
    ]);
  }
}

interface ResearchStudyRow {
  id: string;
  physicianId: string;
  hypothesis: string | null;
  results: string | null;
  analysis: string | null;
  conclusion: string | null;
  status: string;
  surgeries: { surgeryId: string }[];
}

function reconstitute(row: ResearchStudyRow): ResearchStudy {
  return ResearchStudy.reconstitute({
    id: row.id,
    physicianId: row.physicianId,
    hypothesis: row.hypothesis ?? undefined,
    results: row.results ?? undefined,
    analysis: row.analysis ?? undefined,
    conclusion: row.conclusion ?? undefined,
    status: row.status as ResearchStudyStatus,
    surgeryIds: row.surgeries.map((s) => s.surgeryId),
  });
}
