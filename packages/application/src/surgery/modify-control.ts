import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface ModifyControlInput {
  physicianId: string;
  surgeryId: string;
  controlId: string;
  changes: {
    observations?: string;
    recordedAt?: Date;
  };
}

export interface ModifyControlOutput {
  surgeryId: string;
  controlId: string;
}

export interface ModifyControlDeps {
  surgeryRepository: SurgeryRepository;
}

/**
 * Only the physician may modify a Control, regardless of who authored it
 * — Surgery.modifyControl already enforces this (and that the control
 * exists) entirely on its own, so this operation is a thin pass-through.
 */
export function modifyControl(deps: ModifyControlDeps) {
  return async function execute(input: ModifyControlInput): Promise<ModifyControlOutput> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    surgery.modifyControl(input.controlId, input.changes, input.physicianId);
    await deps.surgeryRepository.save(surgery);

    return { surgeryId: surgery.id, controlId: input.controlId };
  };
}
