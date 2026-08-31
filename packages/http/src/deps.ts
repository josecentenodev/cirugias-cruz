import type {
  PatientRepository,
  PhysicianCredentialRepository,
  PhysicianRepository,
  ProcedureTypeRepository,
  PasswordHasher,
  SessionRepository,
  SurgeryRepository,
} from "@cirugias-cruz/application";

/**
 * Everything the HTTP layer needs to build Application operations. Plain
 * data, assembled once at process start (see src/index.ts) — no DI
 * container, no factory abstraction beyond what Application's own
 * `operation(deps)` pattern already requires.
 */
export interface AppDeps {
  physicianRepository: PhysicianRepository;
  physicianCredentialRepository: PhysicianCredentialRepository;
  passwordHasher: PasswordHasher;
  sessionRepository: SessionRepository;
  patientRepository: PatientRepository;
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
}
