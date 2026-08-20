import type { Resident } from "@cirugias-cruz/domain";

/**
 * Only findById is needed today: no current Application operation writes
 * a Resident, so no save() is declared until one actually does.
 */
export interface ResidentRepository {
  findById(id: string): Promise<Resident | null>;
}
