import {
  CustomField,
  type CustomFieldConstraint,
  type CustomFieldScope,
} from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface EditCustomFieldInput {
  physicianId: string;
  procedureTypeId: string;
  customFieldId: string;
  name: string;
  description?: string;
  scope: CustomFieldScope;
  constraint: CustomFieldConstraint;
}

export interface EditCustomFieldOutput {
  procedureTypeId: string;
  customFieldId: string;
}

export interface EditCustomFieldDeps {
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
}

/**
 * Replaces a CustomField definition wholesale (all-or-nothing, ADR 0027),
 * rejected once any Surgery or Control holds a value for it — the freeze
 * check runs here against the SurgeryRepository.
 */
export function editCustomField(deps: EditCustomFieldDeps) {
  return async function execute(input: EditCustomFieldInput): Promise<EditCustomFieldOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const inUse = await deps.surgeryRepository.isCustomFieldDefinitionInUse(
      input.physicianId,
      input.customFieldId,
    );

    const replacement = CustomField.create({
      id: input.customFieldId,
      name: input.name,
      description: input.description,
      scope: input.scope,
      constraint: input.constraint,
    });

    procedureType.editCustomField(input.customFieldId, replacement, input.physicianId, {
      inUse,
    });
    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id, customFieldId: input.customFieldId };
  };
}
