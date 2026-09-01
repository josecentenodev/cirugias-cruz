import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface DeleteResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
}

export interface DeleteResearchStudyOutput {
  researchStudyId: string;
}

export interface DeleteResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Thin wrapper over ResearchStudy.assertCanBeDeletedBy — Domain enforces
 * both tenant ownership and the DRAFT-only rule; Application only loads,
 * asks, and (on success) deletes.
 */
export function deleteResearchStudy(deps: DeleteResearchStudyDeps) {
  return async function execute(
    input: DeleteResearchStudyInput,
  ): Promise<DeleteResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.assertCanBeDeletedBy(input.physicianId);
    await deps.researchStudyRepository.delete(study.id);

    return { researchStudyId: study.id };
  };
}
