import { authedApiRequest } from "@/lib/authed-api-request";
import type { ControlDefinitionDto, CustomFieldDto } from "@/features/procedure-types/dtos";
import type { SurgeryDto } from "@/features/surgeries/dtos";

/**
 * The `/me/surgeries*` wire shape — `SurgeryDto` plus `patientName`/
 * `procedureTypeName`, resolved server-side (`api`'s
 * `serializeSurgeryForResident`, `packages/http/src/routes/resident.ts`)
 * since a Resident's session has no route to the Physician-only Patient/
 * ProcedureType reads `web` otherwise uses to build a name lookup.
 */
export interface OwnSurgeryDto extends SurgeryDto {
  patientName: string;
  procedureTypeName: string;
  /**
   * The owning Procedure Type's CustomField definitions. Populated on
   * `GET /me/surgeries/:id` (so the record-Control form can render
   * CONTROL-scoped inputs); the list read (`GET /me/surgeries`) returns
   * `[]`.
   */
  customFields: CustomFieldDto[];
  /** The owning Procedure Type's control definitions (ADR 0026). Populated on the single read; `[]` on the list read. */
  controlDefinitions: ControlDefinitionDto[];
}

/**
 * A Resident's own "Surgery panel" (ADR 0017) — `GET /me/surgeries`,
 * distinct from the Physician's `GET /surgeries` (`listSurgeries` in
 * `features/surgeries/queries.ts`): scoped server-side to Surgeries this
 * Resident participates in, nothing else in the tenant.
 */
export async function listOwnSurgeries(): Promise<OwnSurgeryDto[]> {
  return authedApiRequest<OwnSurgeryDto[]>({ method: "GET", path: "/me/surgeries" });
}

/** `GET /me/surgeries/:id` — 404s (via `ApiNotFoundError`) for a Surgery this Resident doesn't participate in, same posture as `getSurgery`'s cross-tenant case. */
export async function getOwnSurgery(surgeryId: string): Promise<OwnSurgeryDto> {
  return authedApiRequest<OwnSurgeryDto>({ method: "GET", path: `/me/surgeries/${surgeryId}` });
}

/**
 * `GET /me` — the one place `web` learns its own residentId. The
 * session cookie itself stays opaque (BFF pattern); this exists only so
 * pages can tell "is this Control mine" for the Edit button (see
 * mappers.ts).
 */
export async function getOwnResidentId(): Promise<string> {
  const { residentId } = await authedApiRequest<{ residentId: string }>({
    method: "GET",
    path: "/me",
  });
  return residentId;
}
