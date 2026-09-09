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
  /** Every Surgery a Resident participates in — the "Surgery panel" ADR 0017 grants them (nothing else in the tenant). */
  findByResidentId(residentId: string): Promise<Surgery[]>;
  save(surgery: Surgery): Promise<void>;
  /**
   * True when any CustomFieldValue (on a Surgery or a Control) in this
   * physician's tenant references the given CustomField definition — the
   * ADR 0027 freeze check. Tenant-scoped: the query is filtered through
   * the physician's own Surgery rows so it can never leak the existence
   * of another tenant's data.
   */
  isCustomFieldDefinitionInUse(physicianId: string, definitionId: string): Promise<boolean>;
  /** True when any Control in this physician's tenant references the given control definition (ADR 0027). Tenant-scoped as above. */
  isControlDefinitionInUse(physicianId: string, definitionId: string): Promise<boolean>;
}
