import { ResearchStudy } from "@cirugias-cruz/domain";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface CreateResearchStudyInput {
  physicianId: string;
  id: string;
  hypothesis?: string;
  results?: string;
  analysis?: string;
  conclusion?: string;
}

export interface CreateResearchStudyOutput {
  researchStudyId: string;
}

export interface CreateResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Creates a Research Study in the acting physician's tenant. No
 * cross-aggregate lookups are needed here — ResearchStudy.create only
 * validates its own fields and the tenant it's given, so this operation is
 * a thin pass-through to the domain, plus persistence.
 */
export function createResearchStudy(deps: CreateResearchStudyDeps) {
  return async function execute(
    input: CreateResearchStudyInput,
  ): Promise<CreateResearchStudyOutput> {
    const study = ResearchStudy.create({
      id: input.id,
      physicianId: input.physicianId,
      hypothesis: input.hypothesis,
      results: input.results,
      analysis: input.analysis,
      conclusion: input.conclusion,
    });

    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id };
  };
}
