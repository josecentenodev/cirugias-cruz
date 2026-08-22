import type {
  Patient,
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
}

export class InMemoryResearchStudyRepository implements ResearchStudyRepository {
  private readonly studies = new Map<string, ResearchStudy>();

  seed(study: ResearchStudy): void {
    this.studies.set(study.id, study);
  }

  findById(id: string): Promise<ResearchStudy | null> {
    return Promise.resolve(this.studies.get(id) ?? null);
  }

  save(study: ResearchStudy): Promise<void> {
    this.studies.set(study.id, study);
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

  save(procedureType: ProcedureType): Promise<void> {
    this.procedureTypes.set(procedureType.id, procedureType);
    return Promise.resolve();
  }
}
