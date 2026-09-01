import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface UpdateHypothesisInput {
  physicianId: string;
  researchStudyId: string;
  hypothesis: string;
}

export interface UpdateHypothesisOutput {
  researchStudyId: string;
  hypothesis: string | undefined;
}

export interface UpdateHypothesisDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Thin wrapper over ResearchStudy.updateHypothesis — Application only
 * loads the aggregate and persists the result; the modifiability and
 * tenant-ownership checks live entirely in Domain.
 */
export function updateHypothesis(deps: UpdateHypothesisDeps) {
  return async function execute(input: UpdateHypothesisInput): Promise<UpdateHypothesisOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.updateHypothesis(input.hypothesis, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, hypothesis: study.hypothesis };
  };
}
