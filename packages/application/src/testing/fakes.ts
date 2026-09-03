import { randomUUID } from "node:crypto";
import type {
  Patient,
  Physician,
  ProcedureType,
  ResearchStudy,
  Resident,
  Surgery,
} from "@cirugias-cruz/domain";
import type { SurgeryRepository } from "../surgery/surgery-repository.js";
import type { ResidentRepository } from "../resident/resident-repository.js";
import type { ResearchStudyRepository } from "../research-study/research-study-repository.js";
import type { PatientRepository } from "../patient/patient-repository.js";
import type { ProcedureTypeRepository } from "../procedure-type/procedure-type-repository.js";
import type { PhysicianRepository } from "../physician/physician-repository.js";
import type {
  PhysicianCredential,
  PhysicianCredentialRepository,
} from "../physician/physician-credential-repository.js";
import type { PasswordHasher } from "../physician/password-hasher.js";
import type { Session, SessionRepository } from "../physician/session-repository.js";
import type {
  EmailConfirmationToken,
  EmailConfirmationTokenRepository,
} from "../physician/email-confirmation-token-repository.js";
import type { EmailSender, SendEmailInput } from "../physician/email-sender.js";

/**
 * In-memory fakes for Application orchestration tests. No Infrastructure
 * exists yet — these let use-case behavior be verified without a database,
 * per docs/architecture/application-layer-discovery.md §4 and the
 * Application Layer proposal's testing strategy.
 */
export class InMemorySurgeryRepository implements SurgeryRepository {
  private readonly surgeries = new Map<string, Surgery>();

  seed(surgery: Surgery): void {
    this.surgeries.set(surgery.id, surgery);
  }

  findById(id: string): Promise<Surgery | null> {
    return Promise.resolve(this.surgeries.get(id) ?? null);
  }

  findByPhysicianId(physicianId: string): Promise<Surgery[]> {
    return Promise.resolve(
      [...this.surgeries.values()].filter((surgery) => surgery.physicianId === physicianId),
    );
  }

  save(surgery: Surgery): Promise<void> {
    this.surgeries.set(surgery.id, surgery);
    return Promise.resolve();
  }
}

export class InMemoryResidentRepository implements ResidentRepository {
  private readonly residents = new Map<string, Resident>();

  seed(resident: Resident): void {
    this.residents.set(resident.id, resident);
  }

  findById(id: string): Promise<Resident | null> {
    return Promise.resolve(this.residents.get(id) ?? null);
  }

  findByPhysicianId(physicianId: string): Promise<Resident[]> {
    return Promise.resolve(
      [...this.residents.values()].filter((resident) => resident.physicianId === physicianId),
    );
  }

  save(resident: Resident): Promise<void> {
    this.residents.set(resident.id, resident);
    return Promise.resolve();
  }
}

export class InMemoryResearchStudyRepository implements ResearchStudyRepository {
  private readonly studies = new Map<string, ResearchStudy>();

  seed(study: ResearchStudy): void {
    this.studies.set(study.id, study);
  }

  findById(id: string): Promise<ResearchStudy | null> {
    return Promise.resolve(this.studies.get(id) ?? null);
  }

  findByPhysicianId(physicianId: string): Promise<ResearchStudy[]> {
    return Promise.resolve(
      [...this.studies.values()].filter((study) => study.physicianId === physicianId),
    );
  }

  save(study: ResearchStudy): Promise<void> {
    this.studies.set(study.id, study);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.studies.delete(id);
    return Promise.resolve();
  }
}

export class InMemoryPatientRepository implements PatientRepository {
  private readonly patients = new Map<string, Patient>();

  seed(patient: Patient): void {
    this.patients.set(patient.id, patient);
  }

  findById(id: string): Promise<Patient | null> {
    return Promise.resolve(this.patients.get(id) ?? null);
  }

  findByPhysicianId(physicianId: string): Promise<Patient[]> {
    return Promise.resolve(
      [...this.patients.values()].filter((patient) => patient.physicianId === physicianId),
    );
  }

  save(patient: Patient): Promise<void> {
    this.patients.set(patient.id, patient);
    return Promise.resolve();
  }
}

export class InMemoryProcedureTypeRepository implements ProcedureTypeRepository {
  private readonly procedureTypes = new Map<string, ProcedureType>();

  seed(procedureType: ProcedureType): void {
    this.procedureTypes.set(procedureType.id, procedureType);
  }

  findById(id: string): Promise<ProcedureType | null> {
    return Promise.resolve(this.procedureTypes.get(id) ?? null);
  }

  findByPhysicianId(physicianId: string): Promise<ProcedureType[]> {
    return Promise.resolve(
      [...this.procedureTypes.values()].filter(
        (procedureType) => procedureType.physicianId === physicianId,
      ),
    );
  }

  save(procedureType: ProcedureType): Promise<void> {
    this.procedureTypes.set(procedureType.id, procedureType);
    return Promise.resolve();
  }
}

export class InMemoryPhysicianRepository implements PhysicianRepository {
  private readonly physicians = new Map<string, Physician>();

  seed(physician: Physician): void {
    this.physicians.set(physician.id, physician);
  }

  findById(id: string): Promise<Physician | null> {
    return Promise.resolve(this.physicians.get(id) ?? null);
  }

  save(physician: Physician): Promise<void> {
    this.physicians.set(physician.id, physician);
    return Promise.resolve();
  }
}

export class InMemoryPhysicianCredentialRepository implements PhysicianCredentialRepository {
  private readonly credentials = new Map<string, PhysicianCredential>();

  /**
   * Defaults to already-confirmed — most tests aren't about the
   * confirmation gate itself. Uses `undefined` (not `??`, which would
   * also override an explicit `confirmedAt: null`) to distinguish
   * "caller didn't pass it" from "caller deliberately passed null".
   */
  seed(credential: Omit<PhysicianCredential, "confirmedAt"> & { confirmedAt?: Date | null }): void {
    this.credentials.set(credential.email.toLowerCase(), {
      ...credential,
      confirmedAt: credential.confirmedAt === undefined ? new Date() : credential.confirmedAt,
    });
  }

  findByEmail(email: string): Promise<PhysicianCredential | null> {
    return Promise.resolve(this.credentials.get(email.toLowerCase()) ?? null);
  }

  save(credential: PhysicianCredential): Promise<void> {
    this.credentials.set(credential.email.toLowerCase(), credential);
    return Promise.resolve();
  }

  markConfirmed(physicianId: string): Promise<void> {
    for (const [key, credential] of this.credentials) {
      if (credential.physicianId === physicianId) {
        this.credentials.set(key, { ...credential, confirmedAt: new Date() });
      }
    }
    return Promise.resolve();
  }
}

export class InMemoryEmailConfirmationTokenRepository implements EmailConfirmationTokenRepository {
  private readonly tokens = new Map<string, EmailConfirmationToken>();

  create(physicianId: string): Promise<EmailConfirmationToken> {
    const token: EmailConfirmationToken = {
      id: randomUUID(),
      physicianId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    this.tokens.set(token.id, token);
    return Promise.resolve(token);
  }

  findById(tokenId: string): Promise<EmailConfirmationToken | null> {
    const token = this.tokens.get(tokenId);
    if (!token || token.expiresAt.getTime() < Date.now()) {
      return Promise.resolve(null);
    }
    return Promise.resolve(token);
  }

  delete(tokenId: string): Promise<void> {
    this.tokens.delete(tokenId);
    return Promise.resolve();
  }
}

/** Records every call instead of actually sending anything — this project's fakes don't reach real network/email services. */
export class FakeEmailSender implements EmailSender {
  readonly sent: SendEmailInput[] = [];

  send(input: SendEmailInput): Promise<void> {
    this.sent.push(input);
    return Promise.resolve();
  }
}

/** Not real hashing — a fake for Application-level tests, which don't need real cryptography. */
export class FakePasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`fake-hash:${plainPassword}`);
  }

  verify(plainPassword: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `fake-hash:${plainPassword}`);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  create(physicianId: string): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      physicianId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  findById(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return Promise.resolve(null);
    }
    return Promise.resolve(session);
  }

  delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    return Promise.resolve();
  }
}
