import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface RemoveControlDefinitionInput {
  physicianId: string;
  procedureTypeId: string;
  controlDefinitionId: string;
}

export interface RemoveControlDefinitionOutput {
  procedureTypeId: string;
  controlDefinitionId: string;
}

export interface RemoveControlDefinitionDeps {
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
}

/** Removes an unused control definition (ADR 0027 — frozen once any Control references it). */
export function removeControlDefinition(deps: RemoveControlDefinitionDeps) {
  return async function execute(
    input: RemoveControlDefinitionInput,
  ): Promise<RemoveControlDefinitionOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const inUse = await deps.surgeryRepository.isControlDefinitionInUse(
      input.physicianId,
      input.controlDefinitionId,
    );

    procedureType.removeControlDefinition(input.controlDefinitionId, input.physicianId, {
      inUse,
    });
    await deps.procedureTypeRepository.save(procedureType);

    return {
      procedureTypeId: procedureType.id,
      controlDefinitionId: input.controlDefinitionId,
    };
  };
}
