import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface UpdateConclusionInput {
  physicianId: string;
  researchStudyId: string;
  conclusion: string;
}

export interface UpdateConclusionOutput {
  researchStudyId: string;
  conclusion: string | undefined;
}

export interface UpdateConclusionDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Thin wrapper over ResearchStudy.updateConclusion — Application only
 * loads the aggregate and persists the result; the modifiability and
 * tenant-ownership checks live entirely in Domain.
 */
export function updateConclusion(deps: UpdateConclusionDeps) {
  return async function execute(input: UpdateConclusionInput): Promise<UpdateConclusionOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.updateConclusion(input.conclusion, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, conclusion: study.conclusion };
  };
}
