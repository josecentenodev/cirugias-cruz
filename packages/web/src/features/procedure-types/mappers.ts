import type { ProcedureTypeDto } from "./dtos";

/** What `ProcedureTypeList` actually renders — display-ready, decoupled from the wire DTO. */
export interface ProcedureTypeView {
  id: string;
  name: string;
  description: string;
  technique: string;
}

const EMPTY_PLACEHOLDER = "—";

export function toProcedureTypeView(dto: ProcedureTypeDto): ProcedureTypeView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? EMPTY_PLACEHOLDER,
    technique: dto.technique ?? EMPTY_PLACEHOLDER,
  };
}
