import type { ResearchStudy } from "@cirugias-cruz/domain";
import type { ResearchStudyRepository } from "./research-study-repository.js";

export interface ListResearchStudiesInput {
  physicianId: string;
}

export interface ResearchStudySummary {
  id: string;
  status: string;
  hypothesis: string | undefined;
  results: string | undefined;
  analysis: string | undefined;
  conclusion: string | undefined;
  surgeryIds: readonly string[];
}

export interface ListResearchStudiesOutput {
  researchStudies: ResearchStudySummary[];
}

export interface ListResearchStudiesDeps {
  researchStudyRepository: ResearchStudyRepository;
}

function toSummary(study: ResearchStudy): ResearchStudySummary {
  return {
    id: study.id,
    status: study.status,
    hypothesis: study.hypothesis,
    results: study.results,
    analysis: study.analysis,
    conclusion: study.conclusion,
    surgeryIds: study.surgeryIds,
  };
}

/** Lists the acting physician's own research studies — never another tenant's. */
export function listResearchStudies(deps: ListResearchStudiesDeps) {
  return async function execute(
    input: ListResearchStudiesInput,
  ): Promise<ListResearchStudiesOutput> {
    const studies = await deps.researchStudyRepository.findByPhysicianId(input.physicianId);
    return { researchStudies: studies.map(toSummary) };
  };
}
