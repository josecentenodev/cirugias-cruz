import type { Resident } from "@cirugias-cruz/domain";

export interface ResidentRepository {
  findById(id: string): Promise<Resident | null>;
  findByPhysicianId(physicianId: string): Promise<Resident[]>;
  save(resident: Resident): Promise<void>;
}
