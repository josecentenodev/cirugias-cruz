import { authedApiRequest } from "@/lib/authed-api-request";
import type { ProcedureTypeDto } from "./dtos";

/**
 * `GET /procedure-types` — scoped server-side to the authenticated
 * physician's tenant. No `getProcedureType`/detail query: per
 * `docs/architecture/ROADMAP.md`'s Milestone 8 Scope and
 * `docs/architecture/milestone-8-design.md` §4, this slice is
 * list + create only — a Procedure Type has no additional detail beyond
 * what its own list row already shows, so a detail page was not built.
 */
export async function listProcedureTypes(): Promise<ProcedureTypeDto[]> {
  return authedApiRequest<ProcedureTypeDto[]>({ method: "GET", path: "/procedure-types" });
}
