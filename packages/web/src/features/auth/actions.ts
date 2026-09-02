"use server";

import { redirect } from "next/navigation";
import { apiRequestRaw } from "@/lib/api-client";
import { getForwardedClientIp } from "@/lib/client-ip";
import { clearSessionCookie, getSessionId, setSessionCookie } from "@/lib/session";
import { parseSessionCookie } from "./parse-session-cookie";
import { loginSchema } from "./schemas";

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
    // route — "invalid email or password," deliberately not distinguishing
    // which. Anything else here is unexpected and best surfaced by
    // error.tsx rather than swallowed as a form message.
    if (response.status === 400) {
      return { error: "Invalid email or password." };
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
