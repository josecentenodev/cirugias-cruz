import { ControlDefinition, type ControlOccurrenceRule } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ProcedureTypeRepository } from "./procedure-type-repository.js";

export interface AddControlDefinitionInput {
  physicianId: string;
  procedureTypeId: string;
  id: string;
  name: string;
  occurrenceRule: ControlOccurrenceRule;
}

export interface AddControlDefinitionOutput {
  procedureTypeId: string;
  controlDefinitionId: string;
}

export interface AddControlDefinitionDeps {
  procedureTypeRepository: ProcedureTypeRepository;
}

/** Adds a control definition to a Procedure Type's scheme (ADR 0026). Adding is always allowed (ADR 0027). */
export function addControlDefinition(deps: AddControlDefinitionDeps) {
  return async function execute(
    input: AddControlDefinitionInput,
  ): Promise<AddControlDefinitionOutput> {
    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }

    const definition = ControlDefinition.create({
      id: input.id,
      name: input.name,
      occurrenceRule: input.occurrenceRule,
    });

    procedureType.addControlDefinition(definition, input.physicianId);
    await deps.procedureTypeRepository.save(procedureType);

    return { procedureTypeId: procedureType.id, controlDefinitionId: definition.id };
  };
}
