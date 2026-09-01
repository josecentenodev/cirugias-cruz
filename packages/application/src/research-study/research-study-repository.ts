import type { ResearchStudy } from "@cirugias-cruz/domain";

export interface ResearchStudyRepository {
  findById(id: string): Promise<ResearchStudy | null>;
  findByPhysicianId(physicianId: string): Promise<ResearchStudy[]>;
  save(study: ResearchStudy): Promise<void>;
  delete(id: string): Promise<void>;
}
