import { DomainError } from "../shared/domain-error.js";

export type ControlAuthor =
  { type: "physician"; physicianId: string } | { type: "resident"; residentId: string };

export interface ControlAttributes {
  id: string;
  observations: string;
  recordedAt: Date;
  author: ControlAuthor;
}

/**
 * A Control has no lifecycle or meaning outside its owning Surgery.
 * It is an internal entity of the Surgery aggregate — it must only be
 * created/modified/removed through Surgery, never constructed directly
 * by outside code with mutation intent.
 *
 * CustomField measurements are intentionally NOT modeled here yet — the
 * CustomField value model remains unresolved (see docs/decisions/0005).
 */
export class Control {
  private constructor(
    private readonly id_: string,
    private observations_: string,
    private recordedAt_: Date,
    private readonly author_: ControlAuthor,
  ) {}

  static create(attributes: ControlAttributes): Control {
    if (!attributes.id.trim()) {
      throw new DomainError("Control requires an id");
    }
    if (!attributes.observations.trim()) {
      throw new DomainError("Control requires observations");
    }
    if (!attributes.recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    if (!attributes.author) {
      throw new DomainError("Control requires an author");
    }

    return new Control(
      attributes.id,
      attributes.observations,
      attributes.recordedAt,
      attributes.author,
    );
  }

  get id(): string {
    return this.id_;
  }

  get observations(): string {
    return this.observations_;
  }

  get recordedAt(): Date {
    return this.recordedAt_;
  }

  get author(): ControlAuthor {
    return this.author_;
  }

  updateObservations(observations: string): void {
    if (!observations.trim()) {
      throw new DomainError("Control requires observations");
    }
    this.observations_ = observations;
  }

  updateRecordedAt(recordedAt: Date): void {
    if (!recordedAt) {
      throw new DomainError("Control requires a date/time");
    }
    this.recordedAt_ = recordedAt;
  }
}
