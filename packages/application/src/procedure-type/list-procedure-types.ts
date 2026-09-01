import type { ProcedureType } from "@cirugias-cruz/domain";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface ListProcedureTypesInput {
  physicianId: string;
}

export interface ListProcedureTypesDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/** Lists every Procedure Type owned by the acting physician's tenant. */
export function listProcedureTypes(deps: ListProcedureTypesDeps) {
  return async function execute(input: ListProcedureTypesInput): Promise<ProcedureType[]> {
    return deps.procedureTypeRepository.findByPhysicianId(input.physicianId);
  };
}
