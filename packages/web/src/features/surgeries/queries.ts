import { notFound } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiNotFoundError } from "@/lib/api-errors";
import type { SurgeryDto } from "./dtos";

/** `GET /surgeries` — scoped server-side to the authenticated physician's tenant. */
export async function listSurgeries(): Promise<SurgeryDto[]> {
  return authedApiRequest<SurgeryDto[]>({ method: "GET", path: "/surgeries" });
}

/**
 * `GET /surgeries/:surgeryId` — the aggregate's full Control history and
 * participating-resident roster arrive in this one response (Surgery
 * already loads them as part of the same consistency boundary; see
 * `application-layer-discovery.md` §1.3/§1.4). A surgery that doesn't
 * exist, or belongs to another physician's tenant, triggers `notFound()`
 * here — mirrors `features/patients/queries.ts`'s `getPatient` exactly.
 */
export async function getSurgery(surgeryId: string): Promise<SurgeryDto> {
  try {
    return await authedApiRequest<SurgeryDto>({ method: "GET", path: `/surgeries/${surgeryId}` });
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    throw error;
  }
}
