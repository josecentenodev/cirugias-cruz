export { NotFoundError } from "./shared/not-found-error.js";

export type { PatientRepository } from "./patient/patient-repository.js";
export {
  registerPatient,
  type RegisterPatientInput,
  type RegisterPatientOutput,
  type RegisterPatientDeps,
} from "./patient/register-patient.js";
export {
  listPatients,
  type ListPatientsInput,
  type ListPatientsDeps,
} from "./patient/list-patients.js";
export { getPatient, type GetPatientInput, type GetPatientDeps } from "./patient/get-patient.js";

export type { ProcedureTypeRepository } from "./procedure-type/procedure-type-repository.js";
export {
  registerProcedureType,
  type RegisterProcedureTypeInput,
  type RegisterProcedureTypeOutput,
  type RegisterProcedureTypeDeps,
} from "./procedure-type/register-procedure-type.js";
export {
  listProcedureTypes,
  type ListProcedureTypesInput,
  type ListProcedureTypesDeps,
} from "./procedure-type/list-procedure-types.js";
export {
  getProcedureType,
  type GetProcedureTypeInput,
  type GetProcedureTypeDeps,
} from "./procedure-type/get-procedure-type.js";

export type { SurgeryRepository } from "./surgery/surgery-repository.js";
export {
  registerSurgery,
  type RegisterSurgeryInput,
  type RegisterSurgeryOutput,
  type RegisterSurgeryDeps,
} from "./surgery/register-surgery.js";
export {
  listSurgeries,
  type ListSurgeriesInput,
  type ListSurgeriesDeps,
} from "./surgery/list-surgeries.js";
export { getSurgery, type GetSurgeryInput, type GetSurgeryDeps } from "./surgery/get-surgery.js";
export {
  assignResidentToSurgery,
  type AssignResidentToSurgeryInput,
  type AssignResidentToSurgeryOutput,
  type AssignResidentToSurgeryDeps,
} from "./surgery/assign-resident-to-surgery.js";
export {
  recordControl,
  type RecordControlInput,
  type RecordControlOutput,
  type RecordControlDeps,
  type RecordControlAuthorInput,
} from "./surgery/record-control.js";
export {
  modifyControl,
  type ModifyControlInput,
  type ModifyControlOutput,
  type ModifyControlDeps,
  type ModifyControlActorInput,
} from "./surgery/modify-control.js";
export {
  removeResidentFromSurgery,
  type RemoveResidentFromSurgeryInput,
  type RemoveResidentFromSurgeryOutput,
  type RemoveResidentFromSurgeryDeps,
} from "./surgery/remove-resident-from-surgery.js";
export {
  listSurgeriesForResident,
  type ListSurgeriesForResidentInput,
  type ListSurgeriesForResidentDeps,
} from "./surgery/list-surgeries-for-resident.js";
export {
  getSurgeryForResident,
  type GetSurgeryForResidentInput,
  type GetSurgeryForResidentDeps,
} from "./surgery/get-surgery-for-resident.js";

export type { PhysicianRepository } from "./physician/physician-repository.js";
export type {
  PhysicianCredential,
  PhysicianCredentialRepository,
} from "./physician/physician-credential-repository.js";
export type { PasswordHasher } from "./physician/password-hasher.js";
export type {
  CreateSessionInput,
  Session,
  SessionRepository,
} from "./physician/session-repository.js";
export type {
  EmailConfirmationToken,
  EmailConfirmationTokenRepository,
} from "./physician/email-confirmation-token-repository.js";
export type { EmailSender, SendEmailInput } from "./physician/email-sender.js";
export {
  registerPhysician,
  type RegisterPhysicianInput,
  type RegisterPhysicianOutput,
  type RegisterPhysicianDeps,
} from "./physician/register-physician.js";
export { login, type LoginInput, type LoginDeps } from "./physician/login.js";
export { logout, type LogoutInput, type LogoutDeps } from "./physician/logout.js";
export {
  sendConfirmationEmail,
  type SendConfirmationEmailInput,
  type SendConfirmationEmailDeps,
} from "./physician/send-confirmation-email.js";
export {
  confirmPhysicianEmail,
  type ConfirmPhysicianEmailInput,
  type ConfirmPhysicianEmailOutput,
  type ConfirmPhysicianEmailDeps,
} from "./physician/confirm-physician-email.js";

export type { ResidentRepository } from "./resident/resident-repository.js";
export type {
  ResidentCredential,
  ResidentCredentialRepository,
} from "./resident/resident-credential-repository.js";
export type { TemporaryPasswordGenerator } from "./resident/temporary-password-generator.js";
export {
  registerResident,
  type RegisterResidentInput,
  type RegisterResidentOutput,
  type RegisterResidentDeps,
} from "./resident/register-resident.js";
export {
  listResidents,
  type ListResidentsInput,
  type ListResidentsDeps,
} from "./resident/list-residents.js";
export {
  getResident,
  type GetResidentInput,
  type GetResidentDeps,
} from "./resident/get-resident.js";
export {
  changeResidentPassword,
  type ChangeResidentPasswordInput,
  type ChangeResidentPasswordDeps,
} from "./resident/change-resident-password.js";
export {
  resetResidentPassword,
  type ResetResidentPasswordInput,
  type ResetResidentPasswordOutput,
  type ResetResidentPasswordDeps,
} from "./resident/reset-resident-password.js";
export {
  setResidentActive,
  type SetResidentActiveInput,
  type SetResidentActiveDeps,
} from "./resident/set-resident-active.js";
export {
  viewResidentTemporaryPassword,
  type ViewResidentTemporaryPasswordInput,
  type ViewResidentTemporaryPasswordOutput,
} from "./resident/view-resident-temporary-password.js";

export type { ResearchStudyRepository } from "./research-study/research-study-repository.js";
export {
  addSurgeryToResearchStudy,
  type AddSurgeryToResearchStudyInput,
  type AddSurgeryToResearchStudyOutput,
  type AddSurgeryToResearchStudyDeps,
} from "./research-study/add-surgery-to-research-study.js";
export {
  createResearchStudy,
  type CreateResearchStudyInput,
  type CreateResearchStudyOutput,
  type CreateResearchStudyDeps,
} from "./research-study/create-research-study.js";
export {
  updateHypothesis,
  type UpdateHypothesisInput,
  type UpdateHypothesisOutput,
  type UpdateHypothesisDeps,
} from "./research-study/update-hypothesis.js";
export {
  updateResults,
  type UpdateResultsInput,
  type UpdateResultsOutput,
  type UpdateResultsDeps,
} from "./research-study/update-results.js";
export {
  updateAnalysis,
  type UpdateAnalysisInput,
  type UpdateAnalysisOutput,
  type UpdateAnalysisDeps,
} from "./research-study/update-analysis.js";
export {
  updateConclusion,
  type UpdateConclusionInput,
  type UpdateConclusionOutput,
  type UpdateConclusionDeps,
} from "./research-study/update-conclusion.js";
export {
  removeSurgeryFromResearchStudy,
  type RemoveSurgeryFromResearchStudyInput,
  type RemoveSurgeryFromResearchStudyOutput,
  type RemoveSurgeryFromResearchStudyDeps,
} from "./research-study/remove-surgery-from-research-study.js";
export {
  moveResearchStudyToInProgress,
  type MoveResearchStudyToInProgressInput,
  type MoveResearchStudyToInProgressOutput,
  type MoveResearchStudyToInProgressDeps,
} from "./research-study/move-research-study-to-in-progress.js";
export {
  completeResearchStudy,
  type CompleteResearchStudyInput,
  type CompleteResearchStudyOutput,
  type CompleteResearchStudyDeps,
} from "./research-study/complete-research-study.js";
export {
  reopenResearchStudy,
  type ReopenResearchStudyInput,
  type ReopenResearchStudyOutput,
  type ReopenResearchStudyDeps,
} from "./research-study/reopen-research-study.js";
export {
  deleteResearchStudy,
  type DeleteResearchStudyInput,
  type DeleteResearchStudyOutput,
  type DeleteResearchStudyDeps,
} from "./research-study/delete-research-study.js";
export {
  listResearchStudies,
  type ListResearchStudiesInput,
  type ListResearchStudiesOutput,
  type ListResearchStudiesDeps,
  type ResearchStudySummary,
} from "./research-study/list-research-studies.js";
export {
  getResearchStudy,
  type GetResearchStudyInput,
  type GetResearchStudyOutput,
  type GetResearchStudyDeps,
} from "./research-study/get-research-study.js";
