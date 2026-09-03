import { DomainError } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export type ModifyControlActorInput =
  { type: "physician" } | { type: "resident"; residentId: string };

export interface ModifyControlInput {
  physicianId: string;
  surgeryId: string;
  controlId: string;
  changes: {
    observations?: string;
    recordedAt?: Date;
  };
  actor: ModifyControlActorInput;
}

export interface ModifyControlOutput {
  surgeryId: string;
  controlId: string;
}

export interface ModifyControlDeps {
  surgeryRepository: SurgeryRepository;
}

/**
 * The Physician may modify any Control in their tenant; a Resident may
 * modify only one they themselves authored (ADR 0017, amending ADR
 * 0004) — `Surgery.modifyControl` enforces exactly which, and that the
 * control exists.
 *
 * Same "signature gap" reasoning `recordControl` already documents: the
 * domain method's resident branch has no notion of *which* tenant is
 * calling (a resident session is always scoped to one physicianId, but
 * the domain object has no way to check that on its own), so this
 * operation closes it explicitly before ever calling the domain method,
 * for every actor branch.
 */
export function modifyControl(deps: ModifyControlDeps) {
  return async function execute(input: ModifyControlInput): Promise<ModifyControlOutput> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    if (surgery.physicianId !== input.physicianId) {
      throw new DomainError("A control may only be modified on a surgery within your own tenant");
    }

    const actingAs =
      input.actor.type === "physician"
        ? ({ type: "physician", physicianId: input.physicianId } as const)
        : ({ type: "resident", residentId: input.actor.residentId } as const);

    surgery.modifyControl(input.controlId, input.changes, actingAs);
    await deps.surgeryRepository.save(surgery);

    return { surgeryId: surgery.id, controlId: input.controlId };
  };
}
