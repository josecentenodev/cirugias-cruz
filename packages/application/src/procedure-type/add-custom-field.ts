import {
  CustomField,
  type CustomFieldConstraint,
  type CustomFieldScope,
} from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface AddCustomFieldInput {
  physicianId: string;
  procedureTypeId: string;
  id: string;
  name: string;
  description?: string;
  unit: string;
  magnitude: string;
  scope: CustomFieldScope;
  constraint: CustomFieldConstraint;
}

export interface AddCustomFieldOutput {
  procedureTypeId: string;
  customFieldId: string;
}

export interface AddCustomFieldDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Orchestrates "the physician defines a new CustomField on one of their
 * Procedure Types" (ADR 0018). This is the mechanism that lets a
 * physician, in any specialty, describe their own structured data —
 * nothing about the field's content is known or assumed here.
 */
export function addCustomField(deps: AddCustomFieldDeps) {
  return async function execute(input: AddCustomFieldInput): Promise<AddCustomFieldOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const customField = CustomField.create({
      id: input.id,
      name: input.name,
      description: input.description,
      unit: input.unit,
      magnitude: input.magnitude,
      scope: input.scope,
      constraint: input.constraint,
    });

    procedureType.addCustomField(customField, input.physicianId);
    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id, customFieldId: customField.id };
  };
}
