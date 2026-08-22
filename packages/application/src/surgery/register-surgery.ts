import { DomainError, Surgery } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { PatientRepository } from "../patient/patient-repository.js";
import type { ProcedureTypeRepository } from "../procedure-type/procedure-type-repository.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface RegisterSurgeryInput {
  physicianId: string;
  id: string;
  patientId: string;
  procedureTypeId: string;
  performedAt: Date;
}

export interface RegisterSurgeryOutput {
  surgeryId: string;
}

export interface RegisterSurgeryDeps {
  surgeryRepository: SurgeryRepository;
  patientRepository: PatientRepository;
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Orchestrates "the physician registers a completed surgery."
 *
 * Surgery.create only checks that patientId/procedureTypeId are non-empty
 * strings — it has no repository access and therefore no way to verify
 * those ids refer to real records belonging to the acting physician's
 * tenant (see docs/architecture/application-layer-discovery.md §4.3 for
 * the same category of gap already identified for Resident/Surgery).
 * Application closes that gap here by loading both referenced aggregates
 * and checking tenant ownership before calling Surgery.create, using the
 * domain's own DomainError since this is a business rule, not an
 * application-specific concern.
 */
export function registerSurgery(deps: RegisterSurgeryDeps) {
  return async function execute(input: RegisterSurgeryInput): Promise<RegisterSurgeryOutput> {
    const patient = await deps.patientRepository.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError(`Patient ${input.patientId} was not found`);
    }
    if (patient.physicianId !== input.physicianId) {
      throw new DomainError("A surgery may only reference a patient within the same tenant");
    }

    const procedureType = await deps.procedureTypeRepository.findById(input.procedureTypeId);
    if (!procedureType) {
      throw new NotFoundError(`Procedure type ${input.procedureTypeId} was not found`);
    }
    if (procedureType.physicianId !== input.physicianId) {
      throw new DomainError("A surgery may only reference a procedure type within the same tenant");
    }

    const surgery = Surgery.create({
      id: input.id,
      physicianId: input.physicianId,
      patientId: input.patientId,
      procedureTypeId: input.procedureTypeId,
      performedAt: input.performedAt,
    });

    await deps.surgeryRepository.save(surgery);

    return { surgeryId: surgery.id };
  };
}
