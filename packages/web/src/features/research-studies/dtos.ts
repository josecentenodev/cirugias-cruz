/**
 * Wire shape `api` actually returns for a Research Study — matches
 * `ResearchStudySummary` (`packages/application/src/research-study/list-research-studies.ts`)
 * field-for-field, not assumed. Unlike Surgery, `surgeryIds` are the only
 * cross-aggregate reference carried here — no nested Surgery data arrives
 * with it (`ResearchStudy` deliberately references Surgeries only by id;
 * see `packages/domain/src/research/research-study.ts`), so resolving
 * those ids to a display label is a presentation-layer join the same way
 * Surgery's own `patientId`/`procedureTypeId` are resolved.
 */
export type ResearchStudyStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED";

export interface ResearchStudyDto {
  id: string;
  status: ResearchStudyStatus;
  hypothesis?: string;
  results?: string;
  analysis?: string;
  conclusion?: string;
  surgeryIds: string[];
}

/**
 * Unlike `/patients`, `/surgeries`, etc. (which serialize a bare array —
 * see `packages/http/src/routes/core-loop.ts`), `GET /research-studies`
 * sends its `ListResearchStudiesOutput` object as-is (`{ researchStudies }`
 * — see `packages/http/src/routes/research-study.ts`), so the list
 * response is wrapped, not a bare array. `GET /research-studies/:id`
 * returns a single `ResearchStudyDto` unwrapped, as usual.
 */
export interface ListResearchStudiesResponse {
  researchStudies: ResearchStudyDto[];
}

/** `POST /research-studies`'s response shape (`CreateResearchStudyOutput`). */
export interface CreateResearchStudyResponse {
  researchStudyId: string;
}

/** `POST /research-studies/:id/status`'s response shape — shared by all three transitions. */
export interface StatusChangeResponse {
  researchStudyId: string;
  status: ResearchStudyStatus;
}

/** Shared response shape of the add/remove-surgery endpoints. */
export interface SurgeryMutationResponse {
  researchStudyId: string;
  surgeryIds: string[];
}
