import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface AddSurgeryToResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
  surgeryId: string;
}

export interface AddSurgeryToResearchStudyOutput {
  researchStudyId: string;
  surgeryIds: readonly string[];
}

export interface AddSurgeryToResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
  surgeryRepository: SurgeryRepository;
}

/**
 * Orchestrates "the physician adds a surgery to their research study's
 * universe" — the canonical cross-aggregate case: Application loads the
 * real Surgery to obtain its authentic id/physicianId (never trusting a
 * caller-supplied physicianId for it), then hands that to
 * ResearchStudy.addSurgery, which performs the actual tenant-match and
 * lifecycle-lock checks itself. Application does not duplicate either
 * check — it only supplies truthful data.
 */
export function addSurgeryToResearchStudy(deps: AddSurgeryToResearchStudyDeps) {
  return async function execute(
    input: AddSurgeryToResearchStudyInput,
  ): Promise<AddSurgeryToResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    study.addSurgery({ id: surgery.id, physicianId: surgery.physicianId }, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return {
      researchStudyId: study.id,
      surgeryIds: study.surgeryIds,
    };
  };
}
