import type { ProcedureType } from "@cirugias-cruz/domain";

export interface ProcedureTypeRepository {
  findById(id: string): Promise<ProcedureType | null>;
  save(procedureType: ProcedureType): Promise<void>;
}
