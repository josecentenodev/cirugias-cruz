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

  updateHypothesis(hypothesis: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.hypothesis_ = hypothesis;
  }

  updateResults(results: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.results_ = results;
  }

  updateAnalysis(analysis: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.analysis_ = analysis;
  }

  updateConclusion(conclusion: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.conclusion_ = conclusion;
  }

  /**
   * The universe is not required to share a Procedure Type, and may
   * include surgeries from multiple patients — the only constraint is
   * that the surgery belongs to the same tenant and the universe is
   * still open (DRAFT).
   */
  addSurgery(surgery: { id: string; physicianId: string }, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertUniverseIsOpen();
    assertActingPhysicianOwnsResource(this.physicianId_, surgery.physicianId);

    this.surgeryIds_.add(surgery.id);
  }

  removeSurgery(surgeryId: string, actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);
    this.assertUniverseIsOpen();

    this.surgeryIds_.delete(surgeryId);
  }

  private assertUniverseIsOpen(): void {
    if (this.status_ !== "DRAFT") {
      throw new DomainError(
        "The research study's surgery universe is locked outside of DRAFT",
      );
    }
  }

  confirmHypothesis(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "DRAFT") {
      throw new DomainError("Only a DRAFT research study can confirm its hypothesis");
    }
    if (!this.hypothesis_?.trim()) {
      throw new DomainError("A hypothesis must be set before it can be confirmed");
    }

    this.status_ = "IN_PROGRESS";
  }

  confirmConclusion(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "IN_PROGRESS") {
      throw new DomainError(
        "Only an IN_PROGRESS research study can confirm its conclusion",
      );
    }
    if (!this.conclusion_?.trim()) {
      throw new DomainError("A conclusion must be set before it can be confirmed");
    }

    this.status_ = "COMPLETED";
  }

  assertCanBeDeletedBy(actingPhysicianId: string): void {
    assertActingPhysicianOwnsResource(this.physicianId_, actingPhysicianId);

    if (this.status_ !== "DRAFT") {
      throw new DomainError("A research study may only be deleted while in DRAFT");
    }
  }
}
