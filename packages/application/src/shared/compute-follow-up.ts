import { periodMilliseconds, type ProcedureType, type Surgery } from "@cirugias-cruz/domain";

export interface FollowUpItem {
  definitionId: string;
  name: string;
  recorded: number;
  expected: number;
  /** performedAt + (recorded + 1) * period — only while `recorded < expected`. */
  nextDueAt: Date | null;
}

/**
 * The per-Surgery, per-capped-definition completeness / next-due
 * projection (ADR 0026, §2.3 "computed on read, never stored"). One entry
 * per capped control definition of the Surgery's ProcedureType.
 */
export function computeFollowUp(procedureType: ProcedureType, surgery: Surgery): FollowUpItem[] {
  return procedureType.controlDefinitions
    .filter((definition) => definition.occurrenceRule.mode === "capped")
    .map((definition) => {
      const rule = definition.occurrenceRule;
      /* c8 ignore next -- narrowed by the filter above */
      if (rule.mode !== "capped") {
        throw new Error("unreachable");
      }

      const recorded = surgery.controls.filter(
        (control) => control.definitionId === definition.id,
      ).length;

      const nextDueAt =
        recorded < rule.count
          ? new Date(surgery.performedAt.getTime() + periodMilliseconds(rule.period, recorded + 1))
          : null;

      return {
        definitionId: definition.id,
        name: definition.name,
        recorded,
        expected: rule.count,
        nextDueAt,
      };
    });
}
