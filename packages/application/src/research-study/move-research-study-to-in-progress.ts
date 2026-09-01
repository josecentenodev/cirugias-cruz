import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface MoveResearchStudyToInProgressInput {
  physicianId: string;
  researchStudyId: string;
}

export interface MoveResearchStudyToInProgressOutput {
  researchStudyId: string;
  status: string;
}

export interface MoveResearchStudyToInProgressDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/** Thin wrapper over ResearchStudy.moveToInProgress. */
export function moveResearchStudyToInProgress(deps: MoveResearchStudyToInProgressDeps) {
  return async function execute(
    input: MoveResearchStudyToInProgressInput,
  ): Promise<MoveResearchStudyToInProgressOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.moveToInProgress(input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, status: study.status };
  };
}
