import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface CompleteResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
}

export interface CompleteResearchStudyOutput {
  researchStudyId: string;
  status: string;
}

export interface CompleteResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/** Thin wrapper over ResearchStudy.complete. */
export function completeResearchStudy(deps: CompleteResearchStudyDeps) {
  return async function execute(
    input: CompleteResearchStudyInput,
  ): Promise<CompleteResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.complete(input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, status: study.status };
  };
}
