import type { ResearchStudy } from "@cirugias-cruz/domain";

export interface ResearchStudyRepository {
  findById(id: string): Promise<ResearchStudy | null>;
  save(study: ResearchStudy): Promise<void>;
}
