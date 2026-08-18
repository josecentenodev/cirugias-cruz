import { assertActingPhysicianOwnsResource } from "../shared/assert-tenant-owner.js";
import { DomainError } from "../shared/domain-error.js";

export type ResearchStudyStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED";

export interface ResearchStudyAttributes {
  id: string;
  physicianId: string;
  hypothesis?: string;
  results?: string;
  analysis?: string;
  conclusion?: string;
}

/**
 * ResearchStudy is an aggregate root. It references Surgeries only by id
 * (plus the surgery's own physicianId, to enforce tenant isolation)
 * rather than embedding the Surgery aggregate — the two evolve
 * independently and a study's universe is just a set of references.
 *
 * Lifecycle: DRAFT and IN_PROGRESS are both fully modifiable (text and
 * surgery universe). COMPLETED is the only non-modifiable state, and it
 * is reversible via reopen() back to IN_PROGRESS.
 */
export class ResearchStudy {
  private status_: ResearchStudyStatus = "DRAFT";
  private readonly surgeryIds_: Set<string> = new Set();

  private constructor(
    private readonly id_: string,
    private readonly physicianId_: string,
    private hypothesis_: string | undefined,
    private results_: string | undefined,
    private analysis_: string | undefined,
    private conclusion_: string | undefined,
  ) {}

  static create(attributes: ResearchStudyAttributes): ResearchStudy {
    if (!attributes.id.trim()) {
      throw new DomainError("ResearchStudy requires an id");
    }
    if (!attributes.physicianId.trim()) {
      throw new DomainError("ResearchStudy must belong to a physician (tenant)");
    }

    return new ResearchStudy(
      attributes.id,
      attributes.physicianId,
      attributes.hypothesis,
      attributes.results,
      attributes.analysis,
      attributes.conclusion,
    );
  }

  get id(): string {
    return this.id_;
  }

  get physicianId(): string {
    return this.physicianId_;
  }

  get status(): ResearchStudyStatus {
    return this.status_;
  }

  get hypothesis(): string | undefined {
    return this.hypothesis_;
  }

  get results(): string | undefined {
    return this.results_;
  }

  get analysis(): string | undefined {
    return this.analysis_;
  }

  get conclusion(): string | undefined {
    return this.conclusion_;
  }

  get surgeryIds(): readonly string[] {
    return [...this.surgeryIds_];
  }

  private assertModifiable(): void {
    if (this.status_ === "COMPLETED") {
      throw new DomainError("A completed research study cannot be modified");
    }
  }

  updateHypothesis(hypothesis: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();
    this.hypothesis_ = hypothesis;
  }

  updateResults(results: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();
    this.results_ = results;
  }

  updateAnalysis(analysis: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();
    this.analysis_ = analysis;
  }

  updateConclusion(conclusion: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();
    this.conclusion_ = conclusion;
  }

  /**
   * The universe is not required to share a Procedure Type, and may
   * include surgeries from multiple patients. It is modifiable in both
   * DRAFT and IN_PROGRESS, and locked only once COMPLETED.
   */
  addSurgery(surgery: { id: string; physicianId: string }, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();
    assertActingPhysicianOwnsResource(this.physicianId_, surgery.physicianId);

    this.surgeryIds_.add(surgery.id);
  }

  removeSurgery(surgeryId: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertModifiable();

    this.surgeryIds_.delete(surgeryId);
  }

  moveToInProgress(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "DRAFT") {
      throw new DomainError("Only a DRAFT research study can move to IN_PROGRESS");
    }

    this.status_ = "IN_PROGRESS";
  }

  complete(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "IN_PROGRESS") {
      throw new DomainError("Only an IN_PROGRESS research study can be completed");
    }

    this.status_ = "COMPLETED";
  }

  /** Completion is reversible: a COMPLETED study can be reopened, becoming fully modifiable again. */
  reopen(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "COMPLETED") {
      throw new DomainError("Only a COMPLETED research study can be reopened");
    }

    this.status_ = "IN_PROGRESS";
  }

  assertCanBeDeletedBy(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "DRAFT") {
      throw new DomainError("A research study may only be deleted while in DRAFT");
    }
  }
}
