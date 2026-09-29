"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { apiRequest, apiRequestRaw } from "@/lib/api-client";
import { toApiError } from "@/lib/api-errors";
import { getForwardedClientIp } from "@/lib/client-ip";
import { FormError, runFormAction } from "@/lib/form-action";
import { clearSessionCookie, getSessionId, setSessionCookie } from "@/lib/session";
import { messages } from "@/messages/en";
import { parseSessionCookie } from "./parse-session-cookie";
import { acceptInvitationSchema, loginSchema, registerSchema } from "./schemas";

/**
 * Unauthenticated-by-definition actions — they call `api-client`
 * directly rather than `authedApiRequest` (there is no session yet).
 * Feedback goes through `runFormAction`
 * (docs/architecture/milestone-12-form-feedback-design.md) like every
 * other form; passwords are never echoed back.
 */

/**
 * `POST /physicians`. A successful registration does **not** set a
 * session cookie or redirect into the product: the account isn't usable
 * until the physician confirms the email just sent (ADR 0015) — the
 * "check your email" page itself is the success feedback.
 */
export async function registerAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: registerSchema,
    input: (fd) => ({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      dateOfBirth: fd.get("dateOfBirth"),
      password: fd.get("password"),
    }),
    invalidMessage: messages.errors.everyField,
    run: (body) => apiRequest({ method: "POST", path: "/physicians", body }),
    success: { redirectTo: "/signup/check-email" },
  });
}

/**
 * Fired from the login screen's "resend confirmation email" prompt
 * (ADR 0028). Deliberately always reports success regardless of what
 * happened server-side — `resendConfirmationEmail` (Application) is
 * silent for "no such email"/"already confirmed" on purpose, and this
 * action must not leak that distinction through a different response.
 * The swallowed failure is that non-leaking posture, not error handling.
 */
export async function resendConfirmationAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email");
  return runFormAction(formData, {
    run: async () => {
      if (typeof email === "string" && email.trim()) {
        await apiRequest({
          method: "POST",
          path: "/email-confirmations/resend",
          body: { email },
        }).catch(() => undefined);
      }
    },
    success: { message: "confirmationResent" },
  });
}

/**
 * `POST /resident-invitations/accept` (ADR 0029). On success, redirects
 * to `/login` rather than logging them in directly — "accepting isn't
 * authenticating", same posture as `registerAction`. The token rides in
 * a hidden field the page re-renders from the URL, so it is never echoed.
 */
export async function acceptInvitationAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: acceptInvitationSchema,
    input: (fd) => ({ token: fd.get("token"), password: fd.get("password") }),
    sensitiveFields: ["token"],
    // A missing token has no visible input to attach its error to.
    invalidMessage: (fieldErrors) => fieldErrors.token ?? messages.errors.everyField,
    run: (body) => apiRequest({ method: "POST", path: "/resident-invitations/accept", body }),
    success: { redirectTo: "/login?reason=invitation-accepted" },
  });
}

/**
 * `POST /sessions`, through `apiRequestRaw` — the one caller that needs a
 * response header (`Set-Cookie`). A rejected login is `api`'s own
 * `DomainError` (400), shown exactly as `api` phrased it: the
 * unconfirmed-account message (ADR 0015) must stay distinct from the
 * generic "invalid email or password". See
 * docs/architecture/milestone-8-design.md §3.
 */
export async function loginAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: loginSchema,
    input: (fd) => ({ email: fd.get("email"), password: fd.get("password") }),
    invalidMessage: messages.errors.loginFields,
    run: async (body) => {
      const response = await apiRequestRaw({
        method: "POST",
        path: "/sessions",
        body,
        clientIp: await getForwardedClientIp(),
      });
      if (!response.ok) {
        throw await toApiError(response, messages.errors.invalidCredentials);
      }

      // Required: fail closed if no valid session id can be extracted from
      // api's response — see
      // docs/architecture/milestone-8-session-security-review.md §3.4. Never
      // call setSessionCookie with an empty/undefined value.
      const parsedCookie = parseSessionCookie(response.headers.get("set-cookie"));
      if (!parsedCookie) {
        throw new FormError(messages.errors.loginFailed);
      }
      await setSessionCookie(parsedCookie.sessionId, parsedCookie.expiresAt);

      // ADR 0017: `api` authenticates two kinds of principal through this
      // one route — the body says which. A malformed/missing body is the
      // physician case (this route's original, still-default shape); the
      // session cookie is already set either way.
      try {
        const payload = (await response.json()) as { userType?: "physician" | "resident" };
        return payload.userType === "resident" ? "resident" : "physician";
      } catch {
        return "physician";
      }
    },
    success: (userType) => ({
      redirectTo: userType === "resident" ? "/resident/surgeries" : "/patients",
    }),
  });
}

/**
 * Required: clears `web_session` on the browser unconditionally, even if
 * invalidating the underlying `api` session fails — see
 * docs/architecture/milestone-8-session-security-review.md §3.3. Logout
 * must always visibly succeed from the physician's side; a failure here
 * is logged, not surfaced. Not a form with feedback, so not a
 * `runFormAction` caller.
 */
export async function logoutAction(): Promise<void> {
  const sessionId = await getSessionId();

  if (sessionId) {
    try {
      await apiRequestRaw({ method: "DELETE", path: "/sessions", sessionId });
    } catch (error) {
      console.error("Failed to invalidate session on logout", error);
    }
  }

  await clearSessionCookie();
  redirect("/login");
}
