import type { Surgery } from "@cirugias-cruz/domain";

/**
 * Control has no repository of its own: it is an internal entity of the
 * Surgery aggregate (see docs/architecture/application-layer-discovery.md
 * §1.3/§3), so every Control-shaped operation is reached by loading and
 * saving the owning Surgery.
 */
export interface SurgeryRepository {
  findById(id: string): Promise<Surgery | null>;
  findByPhysicianId(physicianId: string): Promise<Surgery[]>;
  save(surgery: Surgery): Promise<void>;
}
