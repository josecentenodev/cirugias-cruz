import { notFound } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiNotFoundError } from "@/lib/api-errors";
import type { ListResearchStudiesResponse, ResearchStudyDto } from "./dtos";

/**
 * `GET /research-studies` — scoped server-side to the authenticated
 * physician's tenant. Unlike `listPatients`/`listSurgeries`, `api` wraps
 * this list in `{ researchStudies }` rather than sending a bare array
 * (see `ListResearchStudiesResponse`); this function unwraps it so every
 * other `list*` query in this codebase keeps the same `Promise<Dto[]>`
 * shape.
 */
export async function listResearchStudies(): Promise<ResearchStudyDto[]> {
  const response = await authedApiRequest<ListResearchStudiesResponse>({
    method: "GET",
    path: "/research-studies",
  });
  return response.researchStudies;
}

/**
 * `GET /research-studies/:id`. A study that doesn't exist, or belongs to
 * another physician's tenant (indistinguishable by design — same
 * reasoning as `getPatient`/`getSurgery`), triggers Next's `notFound()`
 * here — the one place this mapping happens.
 */
export async function getResearchStudy(researchStudyId: string): Promise<ResearchStudyDto> {
  try {
    return await authedApiRequest<ResearchStudyDto>({
      method: "GET",
      path: `/research-studies/${researchStudyId}`,
    });
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    throw error;
  }
}
