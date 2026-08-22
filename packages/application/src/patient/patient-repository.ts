import type { Patient } from "@cirugias-cruz/domain";

export interface PatientRepository {
  findById(id: string): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
}
