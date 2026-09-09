import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface RemoveCustomFieldInput {
  physicianId: string;
  procedureTypeId: string;
  customFieldId: string;
}

export interface RemoveCustomFieldOutput {
  procedureTypeId: string;
  customFieldId: string;
}

export interface RemoveCustomFieldDeps {
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
}

/** Removes an unused CustomField definition (ADR 0027 — frozen once it holds any value). */
export function removeCustomField(deps: RemoveCustomFieldDeps) {
  return async function execute(input: RemoveCustomFieldInput): Promise<RemoveCustomFieldOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const inUse = await deps.surgeryRepository.isCustomFieldDefinitionInUse(
      input.physicianId,
      input.customFieldId,
    );

    procedureType.removeCustomField(input.customFieldId, input.physicianId, { inUse });
    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id, customFieldId: input.customFieldId };
  };
}
