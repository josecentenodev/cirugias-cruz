import { authedApiRequest } from "@/lib/authed-api-request";
import type { ResidentDto } from "./dtos";

/**
 * `GET /residents` — scoped server-side to the authenticated physician's
 * tenant. No `getResident`/detail query, matching this milestone's
 * documented Scope (list + create + assign/remove on a surgery — no
 * Resident detail page) and the same "don't add what nothing calls"
 * reasoning already applied to Procedure Type. Consumed both by
 * `app/(dashboard)/residents/page.tsx` and by the Surgery detail page's
 * assign-a-resident picker (`features/surgeries/components/AssignResidentForm.tsx`).
 */
export async function listResidents(): Promise<ResidentDto[]> {
  return authedApiRequest<ResidentDto[]>({ method: "GET", path: "/residents" });
}
