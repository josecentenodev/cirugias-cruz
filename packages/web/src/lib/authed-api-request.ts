import { redirect } from "next/navigation";
import { apiRequest, type ApiRequestOptions } from "./api-client";
import { ApiAuthError } from "./api-errors";
import { getForwardedClientIp } from "./client-ip";
import { getSessionId } from "./session";

/**
 * The single centralization point for "every authenticated call to `api`
 * must redirect to `/login` if the session is missing or has died" —
 * used by every protected feature's `queries.ts`/`actions.ts`, so this
 * isn't re-implemented (or forgotten) per resource. `POST /sessions`
 * and `POST /physicians` are the only calls that deliberately do NOT go
 * through this wrapper (see `features/auth/actions.ts`) — those are
 * unauthenticated by definition, and a rejected login is an
 * `ApiDomainError` (400), never `ApiAuthError` (401), so there's no
 * ambiguity this wrapper needs to resolve for them.
 *
 * `api-client.ts` itself stays framework-agnostic (no `next/navigation`
 * import) — this is the one file that turns "the session is invalid"
 * into a routing decision, per
 * docs/architecture/milestone-8-design.md §2/§7.
 */
export async function authedApiRequest<T>(
  options: Omit<ApiRequestOptions, "sessionId" | "clientIp">,
): Promise<T> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    // Defensive: middleware already checks cookie presence before a
    // protected page/action runs, but a Server Action can be invoked in
    // ways that don't guarantee middleware re-ran first — fail closed.
    redirect("/login");
  }

  const clientIp = await getForwardedClientIp();

  try {
    return await apiRequest<T>({ ...options, sessionId, clientIp });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      redirect("/login");
    }
    throw error;
  }
}
