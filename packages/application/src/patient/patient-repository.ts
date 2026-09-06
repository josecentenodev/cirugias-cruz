import type { Patient } from "@cirugias-cruz/domain";

export interface PatientRepository {
  findById(id: string): Promise<Patient | null>;
  /**
   * Every Patient in the tenant, optionally narrowed to those whose first
   * name, last name or `dni` contains `query` (case-insensitive). An
   * empty/blank `query` is ignored.
   */
  findByPhysicianId(physicianId: string, query?: string): Promise<Patient[]>;
  /** The Patient in this tenant with this exact `dni`, if any — for the register-time uniqueness check (ADR 0021). */
  findByDni(physicianId: string, dni: string): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
}
