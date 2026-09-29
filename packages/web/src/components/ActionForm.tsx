"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestFlashCheck, showSuccessToast } from "@/components/Toaster";
import { idleResult, type ActionResult, type FormActionFn } from "@/lib/action-result";
import { cn } from "@/lib/cn";

/**
 * The client half of Milestone 12's centralized form feedback
 * (docs/architecture/milestone-12-form-feedback-design.md §5). The ONLY
 * place in `packages/web` that calls `useActionState` — feature
 * components render `<ActionForm>` (or a confirm built on
 * `useFormAction`) and never read an action's result themselves.
 */

/**
 * `useActionState` plus the app-wide feedback side effects: a success
 * toast for an in-place success, and a flash check once the submission
 * settles (a redirect back to the same page never changes the pathname,
 * so the Toaster's own route-change check alone would miss it).
 */
export function useFormAction(action: FormActionFn) {
  const [result, formAction, isPending] = useActionState(action, idleResult);

  const lastToastedId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (result.status !== "success" || !result.message) return;
    // Guards the StrictMode double effect run, not a second real success (that has a new id).
    if (lastToastedId.current === result.id) return;
    lastToastedId.current = result.id;
    showSuccessToast(result.message);
  }, [result]);

  // Two triggers, because which one fires depends on how React reconciles
  // the redirect: a settled submission on a form that survives it, and a
  // (re)mount for a form the redirect re-created.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending) requestFlashCheck();
    wasPending.current = isPending;
  }, [isPending]);
  useEffect(() => {
    requestFlashCheck();
  }, []);

  return [result, formAction, isPending] as const;
}

type FormContextValue = { result: ActionResult; idPrefix: string };
const FormContext = createContext<FormContextValue>({ result: idleResult, idPrefix: "" });

/** The current form's last result — for the rare leaf that must react to it (e.g. LoginForm's resend prompt). */
export function useActionResult(): ActionResult {
  return useContext(FormContext).result;
}

/**
 * Wires one field to the enclosing `<ActionForm>`: a per-form unique id,
 * the echoed value after a rejected submit (so nothing the user typed is
 * lost), and its field-level error. Spread `inputProps` onto any
 * `<input>`/`<textarea>`/`<select>`.
 */
export function useField(name: string, fallbackValue?: string) {
  const { result, idPrefix } = useContext(FormContext);
  const id = `${idPrefix}-${name}`;
  const errorId = `${id}-error`;
  const error = result.status === "error" ? result.fieldErrors?.[name] : undefined;
  const echoed = result.status === "error" ? result.values?.[name] : undefined;
  return {
    id,
    errorId,
    error,
    inputProps: {
      id,
      name,
      defaultValue: echoed ?? fallbackValue ?? "",
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
    },
  };
}

/** The inline, focus-receiving form-level error. Renders nothing unless the last result is an error. */
export function FormFeedback({ result }: { result: ActionResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const errorId = result.status === "error" ? result.id : undefined;
  useEffect(() => {
    if (errorId !== undefined) ref.current?.focus();
  }, [errorId]);

  if (result.status !== "error") return null;
  return (
    <Alert ref={ref} tabIndex={-1} className="outline-none">
      {result.message}
    </Alert>
  );
}

export function ActionForm({
  action,
  children,
  ...formProps
}: { action: FormActionFn; children: ReactNode } & Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "action" | "children"
>) {
  const [result, formAction] = useFormAction(action);
  const idPrefix = useId();
  return (
    <FormContext.Provider value={{ result, idPrefix }}>
      <form action={formAction} {...formProps}>
        <FormFeedback result={result} />
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-xs text-danger">
      {error}
    </p>
  );
}

/** Label + input + field error, bound to the enclosing `<ActionForm>`. */
export function FormField({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  autoComplete,
  hint,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  hint?: ReactNode;
  className?: string;
}) {
  const field = useField(name, defaultValue);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={field.id}>{label}</Label>
      <Input {...field.inputProps} type={type} required={required} autoComplete={autoComplete} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError id={field.errorId} error={field.error} />
    </div>
  );
}
