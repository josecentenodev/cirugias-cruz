import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";
import type { ResearchStudySummary } from "./list-research-studies.js";

export interface GetResearchStudyInput {
  physicianId: string;
  researchStudyId: string;
}

export type GetResearchStudyOutput = ResearchStudySummary;

export interface GetResearchStudyDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Reads a single research study. A study belonging to another physician is
 * reported as not found rather than as a tenant/permission error, so a
 * caller can never learn that a given id exists in someone else's tenant.
 */
export function getResearchStudy(deps: GetResearchStudyDeps) {
  return async function execute(input: GetResearchStudyInput): Promise<GetResearchStudyOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study || study.physicianId !== input.physicianId) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    return {
      id: study.id,
      status: study.status,
      hypothesis: study.hypothesis,
      results: study.results,
      analysis: study.analysis,
      conclusion: study.conclusion,
      surgeryIds: study.surgeryIds,
    };
  };
}
