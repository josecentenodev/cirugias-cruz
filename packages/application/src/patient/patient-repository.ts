import type { Patient } from "@cirugias-cruz/domain";

export interface PatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByPhysicianId(physicianId: string): Promise<Patient[]>;
  save(patient: Patient): Promise<void>;
}
