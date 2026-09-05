import { notFound } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiNotFoundError } from "@/lib/api-errors";
import type { ProcedureTypeDto } from "./dtos";

/**
 * `GET /procedure-types` — scoped server-side to the authenticated
 * physician's tenant.
 */
export async function listProcedureTypes(): Promise<ProcedureTypeDto[]> {
  return authedApiRequest<ProcedureTypeDto[]>({ method: "GET", path: "/procedure-types" });
}

/**
 * `GET /procedure-types/:id` — includes the Procedure Type's CustomField
 * definitions (Milestone 8.6, ADR 0018), since they live inside the same
 * aggregate and `serializeProcedureType` already returns them together.
 * A procedure type that doesn't exist, or belongs to another physician's
 * tenant, triggers `notFound()` here — mirrors
 * `features/surgeries/queries.ts`'s `getSurgery` exactly.
 */
export async function getProcedureType(procedureTypeId: string): Promise<ProcedureTypeDto> {
  try {
    return await authedApiRequest<ProcedureTypeDto>({
      method: "GET",
      path: `/procedure-types/${procedureTypeId}`,
    });
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    throw error;
  }
}
