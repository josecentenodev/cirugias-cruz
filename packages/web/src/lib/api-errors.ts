/**
 * Typed errors `api-client.ts` throws for every non-2xx response from
 * `api`. This is the one place an HTTP status code is turned into a
 * meaning — nothing above this layer (queries, actions, components)
 * branches on a raw numeric status again. See
 * docs/architecture/milestone-8-design.md §7.
 */

/** `api` returned 401 — no session, or the session is expired/invalid. Never a login-credentials failure (see ApiDomainError). */
export class ApiAuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "ApiAuthError";
  }
}

/** `api` returned 404 — resource doesn't exist, or belongs to another physician's tenant (deliberately indistinguishable). */
export class ApiNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiNotFoundError";
  }
}

/**
 * `api` returned 400 — a `DomainError`. The message is already written
 * by Domain to be safely shown to the acting physician (see
 * `packages/http/src/shared/errors.ts`) — displayed as-is, never
 * reinterpreted or reworded here.
 */
export class ApiDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiDomainError";
  }
}

/**
 * A 429 (rate limited) from `api`. Distinct from ApiDomainError because
 * the message isn't a Domain rejection — it's an operational signal
 * ("try again shortly") the UI can phrase in its own words.
 */
export class ApiRateLimitedError extends Error {
  constructor(message = "Too many attempts — please wait and try again.") {
    super(message);
    this.name = "ApiRateLimitedError";
  }
}

/**
 * Anything else: 500, an unparseable body, or the fetch itself failing
 * (network error, `api` unreachable). Never shown verbatim to the
 * physician — the message here is for server-side logs only. Let this
 * propagate uncaught out of a Server Component/Server Action so Next's
 * nearest `error.tsx` boundary handles it.
 */
export class ApiUnexpectedError extends Error {
  constructor(message = "Unexpected error contacting the API") {
    super(message);
    this.name = "ApiUnexpectedError";
  }
}

export async function toApiError(response: Response): Promise<Error> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const message =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : undefined;

  switch (response.status) {
    case 401:
      return new ApiAuthError(message);
    case 404:
      return new ApiNotFoundError(message ?? "Not found");
    case 400:
      return new ApiDomainError(message ?? "The request was rejected");
    case 429:
      return new ApiRateLimitedError(message);
    default:
      return new ApiUnexpectedError(`api responded ${response.status}`);
  }
}
