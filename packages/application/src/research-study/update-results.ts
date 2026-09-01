import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface UpdateResultsInput {
  physicianId: string;
  researchStudyId: string;
  results: string;
}

export interface UpdateResultsOutput {
  researchStudyId: string;
  results: string | undefined;
}

export interface UpdateResultsDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Thin wrapper over ResearchStudy.updateResults — Application only loads
 * the aggregate and persists the result; the modifiability and
 * tenant-ownership checks live entirely in Domain.
 */
export function updateResults(deps: UpdateResultsDeps) {
  return async function execute(input: UpdateResultsInput): Promise<UpdateResultsOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.updateResults(input.results, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, results: study.results };
  };
}
