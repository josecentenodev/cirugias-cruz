export { NotFoundError } from "./shared/not-found-error.js";

export type { PatientRepository } from "./patient/patient-repository.js";
export {
  registerPatient,
  type RegisterPatientInput,
  type RegisterPatientOutput,
  type RegisterPatientDeps,
} from "./patient/register-patient.js";

export type { ProcedureTypeRepository } from "./procedure-type/procedure-type-repository.js";
export {
  registerProcedureType,
  type RegisterProcedureTypeInput,
  type RegisterProcedureTypeOutput,
  type RegisterProcedureTypeDeps,
} from "./procedure-type/register-procedure-type.js";

export type { SurgeryRepository } from "./surgery/surgery-repository.js";
export {
  registerSurgery,
  type RegisterSurgeryInput,
  type RegisterSurgeryOutput,
  type RegisterSurgeryDeps,
} from "./surgery/register-surgery.js";
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
} from "./surgery/modify-control.js";

export type { ResidentRepository } from "./resident/resident-repository.js";

export type { ResearchStudyRepository } from "./research-study/research-study-repository.js";
export {
  addSurgeryToResearchStudy,
  type AddSurgeryToResearchStudyInput,
  type AddSurgeryToResearchStudyOutput,
  type AddSurgeryToResearchStudyDeps,
} from "./research-study/add-surgery-to-research-study.js";
