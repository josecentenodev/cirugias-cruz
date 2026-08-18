import { DomainError } from "./domain-error.js";

export function assertActingPhysicianOwnsResource(
  resourcePhysicianId: string,
  actingPhysicianId: string,
): void {
  if (resourcePhysicianId !== actingPhysicianId) {
    throw new DomainError("Only the physician who owns this tenant may perform this action");
  }
}
