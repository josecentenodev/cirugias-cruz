import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface RemoveSurgeryFromResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
  surgeryId: string;
}

export interface RemoveSurgeryFromResearchStudyOutput {
  researchStudyId: string;
  surgeryIds: readonly string[];
}

export interface RemoveSurgeryFromResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Mirrors addSurgeryToResearchStudy. Unlike addSurgery, removeSurgery only
 * needs the surgery's id (Domain doesn't need to re-verify a surgery being
 * removed), so no SurgeryRepository lookup is needed here.
 */
export function removeSurgeryFromResearchStudy(deps: RemoveSurgeryFromResearchStudyDeps) {
  return async function execute(
    input: RemoveSurgeryFromResearchStudyInput,
  ): Promise<RemoveSurgeryFromResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.removeSurgery(input.surgeryId, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return {
      researchStudyId: study.id,
      surgeryIds: study.surgeryIds,
    };
  };
}
