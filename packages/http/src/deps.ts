import type {
  EmailConfirmationTokenRepository,
  EmailSender,
  PatientRepository,
  PhysicianCredentialRepository,
  PhysicianRepository,
  ProcedureTypeRepository,
  PasswordHasher,
  ResearchStudyRepository,
  ResidentRepository,
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
  emailConfirmationTokenRepository: EmailConfirmationTokenRepository;
  emailSender: EmailSender;
  patientRepository: PatientRepository;
  procedureTypeRepository: ProcedureTypeRepository;
  surgeryRepository: SurgeryRepository;
  residentRepository: ResidentRepository;
  researchStudyRepository: ResearchStudyRepository;
  /**
   * `web`'s own public origin — the base every confirmation link is
   * built from (ADR 0015). Plain config, not a repository/service, but
   * lives here for the same reason: assembled once at process start,
   * not read from `process.env` deeper in the call stack.
   */
  webBaseUrl: string;
}
