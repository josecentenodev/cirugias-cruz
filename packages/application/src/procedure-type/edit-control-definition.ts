import type { ControlOccurrenceRule } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface EditControlDefinitionInput {
  physicianId: string;
  procedureTypeId: string;
  controlDefinitionId: string;
  changes: { name?: string; occurrenceRule?: ControlOccurrenceRule };
}

export interface EditControlDefinitionOutput {
  procedureTypeId: string;
  controlDefinitionId: string;
}

export interface EditControlDefinitionDeps {
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
}

/**
 * Edits a control definition's typing + occurrence rule (ADR 0026),
 * rejected once any Control references it — the ADR 0027 freeze rule,
 * checked here against the SurgeryRepository, not as an entity invariant.
 */
export function editControlDefinition(deps: EditControlDefinitionDeps) {
  return async function execute(
    input: EditControlDefinitionInput,
  ): Promise<EditControlDefinitionOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const inUse = await deps.surgeryRepository.isControlDefinitionInUse(
      input.physicianId,
      input.controlDefinitionId,
    );

    procedureType.editControlDefinition(
      input.controlDefinitionId,
      input.changes,
      input.physicianId,
      { inUse },
    );
    await deps.procedureTypeRepository.save(procedureType);

    return {
      procedureTypeId: procedureType.id,
      controlDefinitionId: input.controlDefinitionId,
    };
  };
}
