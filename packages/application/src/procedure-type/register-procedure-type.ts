import { ProcedureType } from "@cirugias-cruz/domain";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface RegisterProcedureTypeInput {
  physicianId: string;
  id: string;
  name: string;
  description?: string;
  technique?: string;
}

export interface RegisterProcedureTypeOutput {
  procedureTypeId: string;
}

export interface RegisterProcedureTypeDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Registers a Procedure Type in the acting physician's tenant. Like
 * RegisterPatient, this is a thin pass-through — ProcedureType.create has
 * no cross-aggregate invariant to enforce.
 */
export function registerProcedureType(deps: RegisterProcedureTypeDeps) {
  return async function execute(
    input: RegisterProcedureTypeInput,
  ): Promise<RegisterProcedureTypeOutput> {
    const procedureType = ProcedureType.create({
      id: input.id,
      physicianId: input.physicianId,
      name: input.name,
      description: input.description,
      technique: input.technique,
    });

    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id };
  };
}
