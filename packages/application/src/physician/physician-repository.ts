import type { Physician } from "@cirugias-cruz/domain";

export interface PhysicianRepository {
  findById(id: string): Promise<Physician | null>;
  save(physician: Physician): Promise<void>;
}
