import { NotFoundError } from "../shared/not-found-error.js";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface UpdateAnalysisInput {
  physicianId: string;
  researchStudyId: string;
  analysis: string;
}

export interface UpdateAnalysisOutput {
  researchStudyId: string;
  analysis: string | undefined;
}

export interface UpdateAnalysisDeps {
  researchStudyRepository: ResearchStudyRepository;
}

/**
 * Thin wrapper over ResearchStudy.updateAnalysis — Application only loads
 * the aggregate and persists the result; the modifiability and
 * tenant-ownership checks live entirely in Domain.
 */
export function updateAnalysis(deps: UpdateAnalysisDeps) {
  return async function execute(input: UpdateAnalysisInput): Promise<UpdateAnalysisOutput> {
    const study = await deps.researchStudyRepository.findById(input.researchStudyId);
    if (!study) {
      throw new NotFoundError(`Research study ${input.researchStudyId} was not found`);
    }

    study.updateAnalysis(input.analysis, input.physicianId);
    await deps.researchStudyRepository.save(study);

    return { researchStudyId: study.id, analysis: study.analysis };
  };
}
