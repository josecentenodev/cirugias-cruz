import { Patient } from "@cirugias-cruz/domain";
import type { PatientRepository } from "./patient-repository.js";

export interface RegisterPatientInput {
  physicianId: string;
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
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
 * Registers a Patient in the acting physician's tenant. No cross-aggregate
 * lookups are needed here — Patient.create only validates its own fields
 * and the tenant it's given, so this operation is a thin pass-through to
 * the domain, plus persistence.
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
      metadata: input.metadata,
      observations: input.observations,
    });

    await deps.patientRepository.save(patient);

    return { patientId: patient.id };
  };
}
