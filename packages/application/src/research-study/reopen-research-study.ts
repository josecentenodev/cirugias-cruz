import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface ReopenResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
}

export interface ReopenResearchStudyOutput {
  researchStudyId: string;
  status: string;
}

export interface ReopenResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/** Thin wrapper over ResearchStudy.reopen. */
export function reopenResearchStudy(deps: ReopenResearchStudyDeps) {
  return async function execute(
    input: ReopenResearchStudyInput,
  ): Promise<ReopenResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.reopen(input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, status: study.status };
  };
}
