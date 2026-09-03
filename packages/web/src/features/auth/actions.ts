"use server";

import { redirect } from "next/navigation";
import { apiRequest, apiRequestRaw } from "@/lib/api-client";
import { ApiDomainError } from "@/lib/api-errors";
import { getForwardedClientIp } from "@/lib/client-ip";
import { clearSessionCookie, getSessionId, setSessionCookie } from "@/lib/session";
import { parseSessionCookie } from "./parse-session-cookie";
import { loginSchema, registerSchema } from "./schemas";

export interface RegisterFormState {
  error?: string;
}

/**
 * `POST /physicians` is unauthenticated by definition — same reasoning
 * as `loginAction` below. Unlike login, a successful registration does
 * **not** set a session cookie or redirect into the product: the
 * account exists but isn't usable until the physician confirms the
 * email that was just sent to them (ADR 0015) — `login` itself would
 * reject it. Redirects to a static "check your email" page instead.
 */
export async function registerAction(
  _previousState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please fill in every field." };
  }

  try {
    await apiRequest({ method: "POST", path: "/physicians", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/signup/check-email");
}

export interface LoginFormState {
  error?: string;
}

/**
 * `POST /sessions` is unauthenticated by definition, so this calls
 * `apiRequestRaw` directly rather than `authedApiRequest` — there is no
 * session yet to attach, and a rejected login surfaces as `api`'s own
 * `DomainError` (400), never a 401, so there's no ambiguity with the
 * "session expired" case `authedApiRequest` exists to handle. See
 * docs/architecture/milestone-8-design.md §3 and
 * docs/architecture/m4-m7-conformance-review.md §2.5 (there is no 403
 * in this API either).
 */
export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter both an email and a password." };
  }

  const clientIp = await getForwardedClientIp();
  const response = await apiRequestRaw({
    method: "POST",
    path: "/sessions",
    body: parsed.data,
    clientIp,
  });

  if (!response.ok) {
    if (response.status === 429) {
      return { error: "Too many attempts — please wait a moment and try again." };
    }
    // 400 (DomainError) is the only other case `api` returns for this
    // route — shown exactly as `api` phrased it, not reworded here.
    // `login` itself returns the same "Invalid email or password" text
    // for a wrong password/unknown email either way (deliberately not
    // distinguishing which), but a *different*, genuinely more useful
    // message for an unconfirmed account (ADR 0015) — hardcoding a
    // single generic string here, as this used to, would silently
    // discard that distinction and leave a physician who hasn't
    // confirmed yet with no idea why login keeps failing. Anything else
    // here is unexpected and best surfaced by error.tsx rather than
    // swallowed as a form message.
    if (response.status === 400) {
      let message = "Invalid email or password.";
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) {
          message = body.error;
        }
      } catch {
        // Malformed/empty body — fall back to the generic message above.
      }
      return { error: message };
    }
    throw new Error(`Unexpected response from the API: ${response.status}`);
  }

  // Required: fail closed if no valid session id can be extracted from
  // api's response — see
  // docs/architecture/milestone-8-session-security-review.md §3.4. Never
  // call setSessionCookie with an empty/undefined value.
  const parsedCookie = parseSessionCookie(response.headers.get("set-cookie"));
  if (!parsedCookie) {
    return { error: "Login failed — please try again." };
  }

  await setSessionCookie(parsedCookie.sessionId, parsedCookie.expiresAt);
  redirect("/patients");
}

/**
 * Required: clears `web_session` on the browser unconditionally, even if
 * invalidating the underlying `api` session fails — see
 * docs/architecture/milestone-8-session-security-review.md §3.3. Logout
 * must always visibly succeed from the physician's side; a failure here
 * is logged, not surfaced.
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
