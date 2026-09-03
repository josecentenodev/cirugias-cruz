import { assertActingPhysicianOwnsResource } from "../shared/assert-tenant-owner.js";
import { DomainError } from "../shared/domain-error.js";
import { Control, type ControlAttributes, type ControlAuthor } from "./control.js";

export type SurgeryState = "DONE";

export interface SurgeryAttributes {
  id: string;
  physicianId: string;
  patientId: string;
  procedureTypeId: string;
  performedAt: Date;
}

export type RecordControlInput = Omit<ControlAttributes, never>;

/**
 * Surgery is the aggregate root for postoperative follow-up. Control is
 * an internal entity of this aggregate: it cannot be created, modified,
 * or removed except through Surgery, because control-authorship rules
 * (who may author, who may edit) depend on Surgery-level state
 * (participating residents, owning physician).
 */
export class Surgery {
  private readonly controls_: Control[] = [];
  private readonly participatingResidentIds_: Set<string> = new Set();

  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private readonly patientId_: string,
    private procedureTypeId_: string,
    private performedAt_: Date,
  ) {}

  static create(attributes: SurgeryAttributes): Surgery {
    if (!attributes.id.trim()) {
      throw new DomainError("Surgery requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("Surgery must belong to a physician (tenant)");
    }
    if (!attributes.patientId.trim()) {
      throw new DomainError("Surgery must belong to exactly one Patient");
    }
    if (!attributes.procedureTypeId.trim()) {
      throw new DomainError("Surgery must belong to exactly one Procedure Type");
    }
    if (!attributes.performedAt) {
      throw new DomainError("Surgery requires a performance/realization date");
    }

    return new Surgery(
      attributes.id,
      attributes.physicianId,
      attributes.patientId,
      attributes.procedureTypeId,
      attributes.performedAt,
    );
  }

  /**
   * Rebuilds a Surgery already known to be valid — from persisted state —
   * including its Controls and participating-resident roster. This is
   * distinct from `create()`: `create()` is the public, validating entry
   * point for *new* surgeries, and intentionally has no way to accept
   * pre-existing child state. `reconstitute()` is the trusted hydration
   * path a repository uses to rebuild the aggregate from a previously
   * saved, already-validated record — it does not re-run "is this a valid
   * new Surgery" checks, because that question does not apply to data that
   * already exists. No repository or persistence concept is referenced
   * here; this stays plain Domain, taking only the shapes Surgery and
   * Control already expose.
   */
  static reconstitute(params: {
    id: string;
    physicianId: string;
    patientId: string;
    procedureTypeId: string;
    performedAt: Date;
    controls: ControlAttributes[];
    participatingResidentIds: string[];
  }): Surgery {
    const surgery = new Surgery(
      params.id,
      params.physicianId,
      params.patientId,
      params.procedureTypeId,
      params.performedAt,
    );

    for (const controlAttributes of params.controls) {
      surgery.controls_.push(Control.create(controlAttributes));
    }
    for (const residentId of params.participatingResidentIds) {
      surgery.participatingResidentIds_.add(residentId);
    }

    return surgery;
  }

  get id(): string {
    return this.id_;
  }

  get physicianId(): string {
    return this.physicianId_;
  }

  get patientId(): string {
    return this.patientId_;
  }

  get procedureTypeId(): string {
    return this.procedureTypeId_;
  }

  get performedAt(): Date {
    return this.performedAt_;
  }

  get state(): SurgeryState {
    return "DONE";
  }

  get controls(): readonly Control[] {
    return [...this.controls_];
  }

  get participatingResidentIds(): readonly string[] {
    return [...this.participatingResidentIds_];
  }

  /**
   * Only the owning physician assigns residents to a surgery. There is no
   * Resident ↔ Patient relationship: assignment happens directly here,
   * and from this assignment the resident participates in this surgery
   * even before recording any control.
   */
  assignResident(residentId: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.participatingResidentIds_.add(residentId);
  }

  /** A resident who has not yet recorded a control here may be removed. */
  removeResident(residentId: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.hasResidentParticipated(residentId)) {
      throw new DomainError(
        "A resident's participation in this surgery must be preserved once they have recorded a control",
      );
    }

    this.participatingResidentIds_.delete(residentId);
  }

  /** True once the resident has authored at least one Control for this Surgery. */
  hasResidentParticipated(residentId: string): boolean {
    return this.controls_.some(
      (control) => control.author.type === "resident" && control.author.residentId === residentId,
    );
  }

  /**
   * The Physician may record a Control directly; a Resident may only
   * record one while participating in this specific Surgery.
   */
  recordControl(input: RecordControlInput): Control {
    if (input.author.type === "physician") {
      assertActingPhysicianOwnsResource(this.physicianId_, input.author.physicianId);
    } else {
      if (!this.participatingResidentIds_.has(input.author.residentId)) {
        throw new DomainError(
          "A resident may only record a Control while participating in this specific Surgery",
        );
      }
    }

    const control = Control.create(input);
    this.controls_.push(control);
    return control;
  }

  private findControl(controlId: string): Control {
    const control = this.controls_.find((c) => c.id === controlId);
    if (!control) {
      throw new DomainError("Control not found in this Surgery");
    }
    return control;
  }

  /**
   * The Physician may modify any Control in their tenant, regardless of
   * who authored it. A Resident may modify only a Control they
   * themselves authored — never another Resident's, and never delete
   * any Control at all (see `deleteControl`, unchanged, Physician-only).
   * This is ADR 0017's amendment to ADR 0004's original
   * Physician-only rule.
   */
  modifyControl(
    controlId: string,
    changes: { observations?: string; recordedAt?: Date },
    actingAs: ControlAuthor,
  ): void {
    const control = this.findControl(controlId);

    if (actingAs.type === "physician") {
      assertActingPhysicianOwnsResource(this.physicianId_, actingAs.physicianId);
    } else {
      if (control.author.type !== "resident" || control.author.residentId !== actingAs.residentId) {
        throw new DomainError("A resident may only modify a Control they themselves authored");
      }
    }

    if (changes.observations !== undefined) {
      control.updateObservations(changes.observations);
    }
    if (changes.recordedAt !== undefined) {
      control.updateRecordedAt(changes.recordedAt);
    }
  }

  deleteControl(controlId: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    const index = this.controls_.findIndex((c) => c.id === controlId);
    if (index === -1) {
      throw new DomainError("Control not found in this Surgery");
    }
    this.controls_.splice(index, 1);
  }

  modify(
    changes: { procedureTypeId?: string; performedAt?: Date },
    actingPhysicianId: string,
  ): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (changes.procedureTypeId !== undefined) {
      if (!changes.procedureTypeId.trim()) {
        throw new DomainError("Surgery must belong to exactly one Procedure Type");
      }
      this.procedureTypeId_ = changes.procedureTypeId;
    }
    if (changes.performedAt !== undefined) {
      this.performedAt_ = changes.performedAt;
    }
  }

  assertCanBeDeletedBy(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
  }
}
