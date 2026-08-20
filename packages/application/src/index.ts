export { NotFoundError } from "./shared/not-found-error.js";

export type { SurgeryRepository } from "./surgery/surgery-repository.js";
export {
  assignResidentToSurgery,
  type AssignResidentToSurgeryInput,
  type AssignResidentToSurgeryOutput,
  type AssignResidentToSurgeryDeps,
} from "./surgery/assign-resident-to-surgery.js";

export type { ResidentRepository } from "./resident/resident-repository.js";

export type { ResearchStudyRepository } from "./research-study/research-study-repository.js";
export {
  addSurgeryToResearchStudy,
  type AddSurgeryToResearchStudyInput,
  type AddSurgeryToResearchStudyOutput,
  type AddSurgeryToResearchStudyDeps,
} from "./research-study/add-surgery-to-research-study.js";
