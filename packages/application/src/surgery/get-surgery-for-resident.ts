import type { Surgery } from "@cirugias-cruz/domain";
import type { PatientRepository } from "../patient/patient-repository.js";
import type { ProcedureTypeRepository } from "../procedure-type/procedure-type-repository.js";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface GetSurgeryForResidentInput {
  residentId: string;
  surgeryId: string;
}

export interface SurgeryForResident {
  surgery: Surgery;
  patientName: string;
  procedureTypeName: string;
}

export interface GetSurgeryForResidentDeps {
  surgeryRepository: SurgeryRepository;
  patientRepository: PatientRepository;
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * Retrieves a single Surgery for a logged-in Resident — full read,
 * including every Control on it (not only their own; ADR 0017, decision
 * item 7), gated on participation rather than tenant ownership (the
 * Physician's equivalent, `getSurgery`, gates on `physicianId`). Not
 * found (404), not "forbidden", for a Surgery the Resident doesn't
 * participate in — same reasoning `getSurgery` already uses for a
 * foreign tenant.
 *
 * Also resolves the Patient/ProcedureType name — see
 * `listSurgeriesForResident`'s doc-comment for why that resolution
 * belongs here rather than in `web`.
 */
export function getSurgeryForResident(deps: GetSurgeryForResidentDeps) {
  return async function execute(input: GetSurgeryForResidentInput): Promise<SurgeryForResident> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery || !surgery.participatingResidentIds.includes(input.residentId)) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    const [patient, procedureType] = await Promise.all([
      deps.patientRepository.findById(surgery.patientId),
      deps.procedureTypeRepository.findById(surgery.procedureTypeId),
    ]);

    return {
      surgery,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : surgery.patientId,
      procedureTypeName: procedureType ? procedureType.name : surgery.procedureTypeId,
    };
  };
}
