import type { Surgery } from "@cirugias-cruz/domain";
import type { PatientRepository } from "../patient/patient-repository.js";
import type { ProcedureTypeRepository } from "../procedure-type/procedure-type-repository.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface ListSurgeriesForResidentInput {
  residentId: string;
}

export interface SurgeryForResident {
  surgery: Surgery;
  patientName: string;
  procedureTypeName: string;
}

export interface ListSurgeriesForResidentDeps {
  surgeryRepository: SurgeryRepository;
  patientRepository: PatientRepository;
  procedureTypeRepository: ProcedureTypeRepository;
}

/**
 * The "Surgery panel" a logged-in Resident sees (ADR 0017) — every
 * Surgery they participate in, nothing else in the tenant. Participation
 * is Surgery-scoped and assignment-based (0010): unrelated to which
 * Patient it's for, and not gated on having recorded a Control yet.
 *
 * Resolves the Patient/ProcedureType name alongside each Surgery: a
 * Resident's session has no route to the Physician-only Patient/
 * ProcedureType reads `web` otherwise uses to build a name lookup, so
 * this operation does it directly — both repositories are already
 * ordinary Application-layer ports, just not previously depended on here.
 */
export function listSurgeriesForResident(deps: ListSurgeriesForResidentDeps) {
  return async function execute(
    input: ListSurgeriesForResidentInput,
  ): Promise<SurgeryForResident[]> {
    const surgeries = await deps.surgeryRepository.findByResidentId(input.residentId);

    return Promise.all(
      surgeries.map(async (surgery) => {
        const [patient, procedureType] = await Promise.all([
          deps.patientRepository.findById(surgery.patientId),
          deps.procedureTypeRepository.findById(surgery.procedureTypeId),
        ]);
        return {
          surgery,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : surgery.patientId,
          procedureTypeName: procedureType ? procedureType.name : surgery.procedureTypeId,
        };
      }),
    );
  };
}
