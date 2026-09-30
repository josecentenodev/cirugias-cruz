"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
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
 * toast for an in-place success, and a flash check whenever the redirect
 * that follows a submission could have landed (a redirect back to the same
 * page never changes the pathname, so the Toaster's own route-change check
 * alone would miss it).
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

  // Three triggers, because which one fires depends on how React reconciles
  // the redirect: a settled submission on a form that survives it, a
  // (re)mount for a form the redirect re-created, and an unmount for a form
  // the redirect removed — a row's own remove button disappears with the
  // row, before it ever settles (2026-09-30: "Control removed." never
  // showed, then surfaced on the next page). Only a form that submitted
  // checks on unmount; a plain navigation away is the Toaster's own job.
  const wasPending = useRef(false);
  const hasSubmitted = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending) requestFlashCheck();
    wasPending.current = isPending;
    if (isPending) hasSubmitted.current = true;
  }, [isPending]);
  useEffect(() => {
    requestFlashCheck();
    return () => {
      if (hasSubmitted.current) requestFlashCheck();
    };
  }, []);

  return [result, formAction, isPending] as const;
}

type FormContextValue = { result: ActionResult; idPrefix: string };
const FormContext = createContext<FormContextValue>({ result: idleResult, idPrefix: "" });

/**
 * A ref for any `<select>` inside an `<ActionForm>` that must keep its
 * choice across a submission. React 19 natively resets the form after
 * every action: an `<input>`/`<textarea>` comes back with its echoed
 * `defaultValue`, but a `<select>` doesn't — React applies a select's
 * `defaultValue` only on mount, and a controlled `value` that didn't
 * change causes no re-render. The DOM falls back to the first option while
 * the UI still shows the old choice, so the retry submits something else
 * (2026-09-30: a control recorded under "General" instead of the chosen
 * type; a scheduled control type saved as "uncapped"). This re-asserts
 * `value` right after the native reset.
 */
export function useSelectSurvivesReset(value: string | undefined) {
  const ref = useRef<HTMLSelectElement>(null);
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const restore = () =>
      queueMicrotask(() => {
        if (ref.current && latest.current !== undefined) ref.current.value = latest.current;
      });
    form.addEventListener("reset", restore);
    return () => form.removeEventListener("reset", restore);
  }, []);
  return ref;
}

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
export function FormFeedback({ result, className }: { result: ActionResult; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const errorId = result.status === "error" ? result.id : undefined;
  useEffect(() => {
    if (errorId !== undefined) ref.current?.focus();
  }, [errorId]);

  if (result.status !== "error") return null;
  return (
    <Alert ref={ref} tabIndex={-1} className={cn("outline-none", className)}>
      {result.message}
    </Alert>
  );
}

export function ActionForm({
  action,
  children,
  feedbackClassName,
  afterForm,
  ...formProps
}: {
  action: FormActionFn;
  children: ReactNode;
  feedbackClassName?: string;
  /** Rendered after the `<form>` but inside its result context — e.g. a follow-up form that must not nest. */
  afterForm?: ReactNode;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "children">) {
  const [result, formAction] = useFormAction(action);
  const idPrefix = useId();
  return (
    <FormContext.Provider value={{ result, idPrefix }}>
      <form action={formAction} {...formProps}>
        <FormFeedback result={result} className={feedbackClassName} />
        {children}
      </form>
      {afterForm}
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

const textareaClass =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-danger";

/** Label + textarea + field error, bound to the enclosing `<ActionForm>`. */
export function FormTextarea({
  name,
  label,
  rows = 3,
  required,
  defaultValue,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  rows?: number;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const field = useField(name, defaultValue);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={field.id}>{label}</Label>
      <textarea
        {...field.inputProps}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={textareaClass}
      />
      <FieldError id={field.errorId} error={field.error} />
    </div>
  );
}

type InputAttrs = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "id" | "defaultValue" | "className" | "children"
>;

/**
 * Label + input + field error, bound to the enclosing `<ActionForm>`.
 * Any other `<input>` attribute (`type`, `step`, `min`, `placeholder`…)
 * passes straight through.
 */
export function FormField({
  name,
  label,
  defaultValue,
  hint,
  className,
  ...inputAttrs
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  hint?: ReactNode;
  className?: string;
} & InputAttrs) {
  const field = useField(name, defaultValue === undefined ? undefined : String(defaultValue));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={field.id}>{label}</Label>
      <Input {...inputAttrs} {...field.inputProps} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError id={field.errorId} error={field.error} />
    </div>
  );
}

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-danger";

/**
 * Label + select + field error. Uncontrolled by default (echoed value
 * after a rejected submit); pass `value` + `onChange` for a select whose
 * choice drives other fields — its own state already survives a submit.
 */
export function FormSelect({
  name,
  label,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  className,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const field = useField(name, defaultValue);
  const { defaultValue: uncontrolledDefault, ...bindings } = field.inputProps;
  const ref = useSelectSurvivesReset(value ?? uncontrolledDefault);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={field.id}>{label}</Label>
      <select
        ref={ref}
        {...bindings}
        {...(value === undefined ? { defaultValue: uncontrolledDefault } : { value, onChange })}
        required={required}
        disabled={disabled}
        className={selectClass}
      >
        {children}
      </select>
      <FieldError id={field.errorId} error={field.error} />
    </div>
  );
}
