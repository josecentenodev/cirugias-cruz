import { NotFoundError } from "../shared/not-found-error.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface ModifyProcedureTypeInput {
  physicianId: string;
  procedureTypeId: string;
  name?: string;
  description?: string;
  technique?: string;
}

export interface ModifyProcedureTypeOutput {
  procedureTypeId: string;
}

export interface ModifyProcedureTypeDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Orchestrates "the physician modifies one of their Procedure Types."
 * Did not exist before Milestone 8.6 — CustomField definitions being
 * addable to a Procedure Type (see addCustomField) is what made this
 * gap (Domain's own `modify()` had no Application entry point) worth
 * closing now, though the capability is general-purpose.
 */
export function modifyProcedureType(deps: ModifyProcedureTypeDeps) {
  return async function execute(
    input: ModifyProcedureTypeInput,
  ): Promise<ModifyProcedureTypeOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    procedureType.modify(
      { name: input.name, description: input.description, technique: input.technique },
      input.physicianId,
    );

    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id };
  };
}
