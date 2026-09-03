import { apiRequest } from "@/lib/api-client";
import { ApiDomainError } from "@/lib/api-errors";

export type ConfirmEmailResult = { ok: true; physicianId: string } | { ok: false; error: string };

/**
 * `POST /email-confirmations` is unauthenticated by definition (the
 * physician has no session yet — that's the whole point). An invalid or
 * already-used token is `api`'s own `ApiDomainError` (400) — an
 * expectable outcome (someone reused an old link), shown inline by the
 * caller, never thrown to `error.tsx`. Anything else propagates
 * uncaught, same as every other query in this codebase.
 */
export async function confirmEmail(token: string): Promise<ConfirmEmailResult> {
  try {
    const output = await apiRequest<{ physicianId: string }>({
      method: "POST",
      path: "/email-confirmations",
      body: { token },
    });
    return { ok: true, physicianId: output.physicianId };
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
