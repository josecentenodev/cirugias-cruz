/**
 * The single result shape every Server Action returns (Milestone 12,
 * implementing docs/architecture/milestone-8-design.md §7). Built only by
 * `lib/form-action.ts`'s `runFormAction` and read only by
 * `components/ActionForm.tsx`'s `useFormAction` — feature code neither
 * constructs nor inspects it.
 *
 * `id` changes on every submission, so two identical consecutive
 * results (the same error twice, the same success twice) still fire
 * their feedback once each.
 */
export type ActionResult =
  | { status: "idle" }
  | { status: "success"; message?: string; id: number }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
      id: number;
    };

export const idleResult: ActionResult = { status: "idle" };

/** A Server Action as `useActionState` sees it, after any `.bind(null, …)` of its leading ids. */
export type FormActionFn = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
