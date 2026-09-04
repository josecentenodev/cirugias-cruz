export { Physician, type PhysicianAttributes } from "./physician/physician.js";
export { Patient, type PatientAttributes } from "./patient/patient.js";
export { Resident, type ResidentAttributes } from "./resident/resident.js";
export { ProcedureType, type ProcedureTypeAttributes } from "./procedure-type/procedure-type.js";
export {
  Surgery,
  type SurgeryAttributes,
  type SurgeryState,
  type RecordControlInput,
} from "./surgery/surgery.js";
export { Control, type ControlAttributes, type ControlAuthor } from "./surgery/control.js";
export {
  ResearchStudy,
  type ResearchStudyAttributes,
  type ResearchStudyStatus,
} from "./research/research-study.js";
export {
  CustomField,
  type CustomFieldAttributes,
  type CustomFieldScope,
  type CustomFieldConstraint,
} from "./shared/custom-field.js";
export {
  CustomFieldValue,
  type CustomFieldValueAttributes,
  type CustomFieldValueData,
} from "./shared/custom-field-value.js";
export { Person, type PersonAttributes } from "./shared/person.js";
export { DomainError } from "./shared/domain-error.js";
