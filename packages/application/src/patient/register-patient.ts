import { DomainError, Patient } from "@cirugias-cruz/domain";
import type { PatientRepository } from "./patient-repository.js";

export interface RegisterPatientInput {
  physicianId: string;
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  dni?: string;
  metadata?: Record<string, unknown>;
  observations?: string;
}

export interface RegisterPatientOutput {
  patientId: string;
}

export interface RegisterPatientDeps {
  patientRepository: PatientRepository;
}

/**
 * Registers a Patient in the acting physician's tenant. `Patient.create`
 * validates its own fields; the one cross-entity rule this operation adds
 * is "no two patients in a tenant share a `dni`" (ADR 0021) — enforced
 * here (and backstopped by a DB unique index), not in the domain, because
 * no aggregate owns the physician's set of patients. Same shape as
 * `validateCustomFieldValues`.
 */
export function registerPatient(deps: RegisterPatientDeps) {
  return async function execute(input: RegisterPatientInput): Promise<RegisterPatientOutput> {
    const patient = Patient.create({
      id: input.id,
      physicianId: input.physicianId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      dni: input.dni,
      metadata: input.metadata,
      observations: input.observations,
    });

    if (patient.dni) {
      const existing = await deps.patientRepository.findByDni(input.physicianId, patient.dni);
      if (existing) {
        throw new DomainError("A patient with this DNI already exists");
      }
    }

    await deps.patientRepository.save(patient);

    return { patientId: patient.id };
  };
}
