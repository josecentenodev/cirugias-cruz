import type { ProcedureType } from "@cirugias-cruz/domain";

export interface ProcedureTypeRepository {
  findById(id: string): Promise<ProcedureType | null>;
  findByPhysicianId(physicianId: string): Promise<ProcedureType[]>;
  save(procedureType: ProcedureType): Promise<void>;
}
