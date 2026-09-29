import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ZodType } from "zod";
import { messages } from "@/messages/en";
import type { ActionResult } from "./action-result";
import { ApiDomainError, ApiNotFoundError, ApiRateLimitedError } from "./api-errors";
import { FLASH_COOKIE, type FeedbackKey } from "./flash";

/**
 * The ONLY `try/catch` around a mutation in `packages/web` (Milestone 12,
 * docs/architecture/milestone-12-form-feedback-design.md §3). Every
 * Server Action is a thin `async function` that calls this — feature
 * code never catches an `Api*Error` itself, never builds an error
 * result, never decides what the physician sees on failure.
 *
 * Mapping (milestone-8-design.md §7):
 * - `ApiDomainError` / `ApiNotFoundError` → inline, message verbatim
 *   (Domain's copy is already written for the physician; never reworded).
 * - `ApiRateLimitedError` → inline, the app's own phrasing.
 * - anything else → inline generic message, logged server-side by class
 *   and message only (never the submitted form data). The form survives
 *   — it no longer blows the page into `error.tsx`.
 * - Next's own control-flow signals (`redirect`, `notFound`, including
 *   `authedApiRequest`'s session-expired redirect) → re-thrown untouched.
 *
 * On error, every submitted string field is echoed back so the form can
 * repopulate (React 19 resets uncontrolled fields after every action),
 * except passwords, `sensitiveFields` and Next's internal `$ACTION…`
 * fields.
 */

type SuccessSpec = { message?: FeedbackKey; redirectTo?: string };

interface FormActionBase<Out> {
  /** Fields that must never be echoed back (passwords are always excluded). */
  sensitiveFields?: readonly string[];
  /** What a successful `run` leads to — static, or derived from `run`'s result. */
  success?: SuccessSpec | ((out: NoInfer<Out>) => SuccessSpec);
}

interface WithSchema<Input, Out> extends FormActionBase<Out> {
  schema: ZodType<Input>;
  /** Builds the raw object `schema` parses, from the submitted form. */
  input: (formData: FormData) => unknown;
  /** Form-level message on a validation failure; defaults to the shared required-fields copy. */
  invalidMessage?: string;
  run: (input: Input) => Promise<Out>;
}

interface WithoutSchema<Out> extends FormActionBase<Out> {
  schema?: undefined;
  run: () => Promise<Out>;
}

/** Flash lifetime: long enough to survive the redirect round trip, short enough to never resurface later. */
const FLASH_MAX_AGE_SECONDS = 30;
const PASSWORD_FIELD = /password/i;

function nextId(): number {
  return Date.now() + Math.random();
}

function echoValues(
  formData: FormData | undefined,
  sensitive: readonly string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  if (!formData) return values;
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (name.startsWith("$") || PASSWORD_FIELD.test(name) || sensitive.includes(name)) continue;
    values[name] = value;
  }
  return values;
}

function fieldErrorsFrom(
  issues: readonly { path: PropertyKey[]; code: string; input?: unknown; message: string }[],
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in fieldErrors) continue;
    // A missing field reaches Zod as `null` (FormData.get) — its raw
    // "expected string, received null" is not physician-facing copy.
    const missing =
      issue.code === "invalid_type" && (issue.input === null || issue.input === undefined);
    fieldErrors[field] = missing ? messages.errors.fieldRequired : issue.message;
  }
  return fieldErrors;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
    return error.message;
  }
  if (error instanceof ApiRateLimitedError) {
    return messages.errors.rateLimited;
  }
  const name = error instanceof Error ? error.name : typeof error;
  const detail = error instanceof Error ? error.message : "";
  console.error(`[form-action] unexpected failure: ${name}: ${detail}`);
  return messages.errors.unexpected;
}

// One signature over a union rather than overloads: with overloads, TS
// fixes a contextually-typed `success: (out) => …` parameter against the
// first candidate and `out` ends up `unknown`.
export async function runFormAction<Input, Out>(
  formData: FormData | undefined,
  config: WithSchema<Input, Out> | WithoutSchema<Out>,
): Promise<ActionResult> {
  const echo = () => echoValues(formData, config.sensitiveFields ?? []);

  let out: Out;
  try {
    if (config.schema) {
      const parsed = config.schema.safeParse(config.input(formData ?? new FormData()));
      if (!parsed.success) {
        return {
          status: "error",
          message: config.invalidMessage ?? messages.errors.requiredFields,
          fieldErrors: fieldErrorsFrom(parsed.error.issues),
          values: echo(),
          id: nextId(),
        };
      }
      out = await config.run(parsed.data);
    } else {
      out = await config.run();
    }
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: messageFor(error), values: echo(), id: nextId() };
  }

  const spec = typeof config.success === "function" ? config.success(out) : (config.success ?? {});
  if (spec.redirectTo) {
    if (spec.message) {
      const store = await cookies();
      store.set(FLASH_COOKIE, spec.message, {
        // Read (and deleted) by the client Toaster, so not httpOnly — it
        // only ever holds a FeedbackKey, never record data.
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: FLASH_MAX_AGE_SECONDS,
        path: "/",
      });
    }
    redirect(spec.redirectTo);
  }
  return {
    status: "success",
    message: spec.message ? messages.feedback[spec.message] : undefined,
    id: nextId(),
  };
}
