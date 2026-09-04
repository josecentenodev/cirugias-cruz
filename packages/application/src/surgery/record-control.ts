import { DomainError } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { CustomFieldValueInput } from "../shared/validate-custom-field-values.js";
import { validateCustomFieldValues } from "../shared/validate-custom-field-values.js";
import type { ProcedureTypeRepository } from "../procedure-type/procedure-type-repository.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export type RecordControlAuthorInput =
  { type: "physician" } | { type: "resident"; residentId: string };

export interface RecordControlInput {
  physicianId: string;
  surgeryId: string;
  id: string;
  observations: string;
  recordedAt: Date;
  author: RecordControlAuthorInput;
  /** CONTROL-scoped CustomField values (ADR 0018), validated against the Procedure Type's definitions. */
  customFieldValues?: CustomFieldValueInput[];
}

export interface RecordControlOutput {
  surgeryId: string;
  controlId: string;
}

export interface RecordControlDeps {
  surgeryRepository: SurgeryRepository;
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Orchestrates "record a postoperative Control" — the capability
 * DOMAIN.md itself names as the product's core purpose.
 *
 * Surgery.recordControl's resident-authored branch only checks that the
 * given residentId is currently participating — it has no parameter for
 * the acting caller's own tenant at all, because participation was
 * already tenant-checked once, at assignment time. That means nothing
 * inside the domain method itself stops a caller from a *different*
 * tenant from invoking it on a surgery they don't own, as long as they
 * somehow knew a valid participating residentId. Application closes that
 * gap explicitly, for every authorship branch, before calling the domain
 * method — this is a genuine signature gap being filled, not a
 * duplication of a check the domain already performs (the physician
 * branch's own tenant check inside Surgery.recordControl remains the
 * domain's, unaffected by this).
 */
export function recordControl(deps: RecordControlDeps) {
  return async function execute(input: RecordControlInput): Promise<RecordControlOutput> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    if (surgery.physicianId !== input.physicianId) {
      throw new DomainError("A control may only be recorded on a surgery within your own tenant");
    }

    const procedureType = await deps.procedureTypeRepository.findById(surgery.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${surgery.procedureTypeId} was not found`);
    }
    validateCustomFieldValues(procedureType.customFields, input.customFieldValues ?? [], "CONTROL");

    const author =
      input.author.type === "physician"
        ? ({ type: "physician", physicianId: input.physicianId } as const)
        : ({ type: "resident", residentId: input.author.residentId } as const);

    const control = surgery.recordControl({
      id: input.id,
      observations: input.observations,
      recordedAt: input.recordedAt,
      author,
      customFieldValues: input.customFieldValues,
    });

    await deps.surgeryRepository.save(surgery);

    return { surgeryId: surgery.id, controlId: control.id };
  };
}
