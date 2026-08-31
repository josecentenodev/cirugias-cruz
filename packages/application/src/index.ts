export { NotFoundError } from "./shared/not-found-error.js";

export type { SurgeryRepository } from "./surgery/surgery-repository.js";
export {
  assignResidentToSurgery,
  type AssignResidentToSurgeryInput,
  type AssignResidentToSurgeryOutput,
  type AssignResidentToSurgeryDeps,
} from "./surgery/assign-resident-to-surgery.js";

export type { PhysicianRepository } from "./physician/physician-repository.js";
export type {
  PhysicianCredential,
  PhysicianCredentialRepository,
} from "./physician/physician-credential-repository.js";
export type { PasswordHasher } from "./physician/password-hasher.js";
export type { Session, SessionRepository } from "./physician/session-repository.js";
export {
  registerPhysician,
  type RegisterPhysicianInput,
  type RegisterPhysicianOutput,
  type RegisterPhysicianDeps,
} from "./physician/register-physician.js";
export { login, type LoginInput, type LoginDeps } from "./physician/login.js";
export { logout, type LogoutInput, type LogoutDeps } from "./physician/logout.js";

export type { ResidentRepository } from "./resident/resident-repository.js";

export type { ResearchStudyRepository } from "./research-study/research-study-repository.js";
export {
  addSurgeryToResearchStudy,
  type AddSurgeryToResearchStudyInput,
  type AddSurgeryToResearchStudyOutput,
  type AddSurgeryToResearchStudyDeps,
} from "./research-study/add-surgery-to-research-study.js";
