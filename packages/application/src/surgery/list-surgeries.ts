import type { Surgery } from "@cirugias-cruz/domain";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface ListSurgeriesInput {
  physicianId: string;
}

export interface ListSurgeriesDeps {
  surgeryRepository: SurgeryRepository;
}

/** Lists every Surgery owned by the acting physician's tenant, including each's Control history. */
export function listSurgeries(deps: ListSurgeriesDeps) {
  return async function execute(input: ListSurgeriesInput): Promise<Surgery[]> {
    return deps.surgeryRepository.findByPhysicianId(input.physicianId);
  };
}
