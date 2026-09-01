import type { ProcedureType } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface GetProcedureTypeInput {
  physicianId: string;
  procedureTypeId: string;
}

export interface GetProcedureTypeDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Retrieves a single Procedure Type, verifying it belongs to the acting
 * physician's tenant. Not found (404) for a foreign Procedure Type — see
 * getPatient for the same reasoning.
 */
export function getProcedureType(deps: GetProcedureTypeDeps) {
  return async function execute(input: GetProcedureTypeInput): Promise<ProcedureType> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType || procedureType.physicianId !== input.physicianId) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    return procedureType;
  };
}
