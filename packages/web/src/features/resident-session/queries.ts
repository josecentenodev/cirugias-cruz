import { authedApiRequest } from "@/lib/authed-api-request";
import type { SurgeryDto } from "@/features/surgeries/dtos";

/**
 * A Resident's own "Surgery panel" (ADR 0017) — `GET /me/surgeries`,
 * distinct from the Physician's `GET /surgeries` (`listSurgeries` in
 * `features/surgeries/queries.ts`): scoped server-side to Surgeries this
 * Resident participates in, nothing else in the tenant. Reuses
 * `SurgeryDto` unchanged — same wire shape, same `serializeSurgery` on
 * `api`'s side (`packages/http/src/routes/core-loop.ts`).
 */
export async function listOwnSurgeries(): Promise<SurgeryDto[]> {
  return authedApiRequest<SurgeryDto[]>({ method: "GET", path: "/me/surgeries" });
}

/** `GET /me/surgeries/:id` — 404s (via `ApiNotFoundError`) for a Surgery this Resident doesn't participate in, same posture as `getSurgery`'s cross-tenant case. */
export async function getOwnSurgery(surgeryId: string): Promise<SurgeryDto> {
  return authedApiRequest<SurgeryDto>({ method: "GET", path: `/me/surgeries/${surgeryId}` });
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
