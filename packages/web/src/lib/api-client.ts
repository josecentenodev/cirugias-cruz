import { ApiUnexpectedError, toApiError } from "./api-errors";

/**
 * The only module in `packages/web` allowed to call `fetch` against
 * `api`. Nothing else — no Server Component, no Server Action, no
 * query/mapper file — calls `fetch` directly. See
 * docs/architecture/milestone-8-design.md §2.
 *
 * Deliberately Next.js-agnostic beyond `cache: "no-store"`: it does not
 * import `next/navigation` or read cookies itself — it takes the
 * session id and client IP as plain arguments and throws typed errors.
 * Turning an `ApiAuthError` into a redirect is `lib/authed-api-request.ts`'s
 * job, one layer up — see that file for why the split.
 */

function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new ApiUnexpectedError("API_BASE_URL is not configured");
  }
  return url;
}

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  sessionId?: string;
  clientIp?: string;
}

export interface ApiRawResponse {
  status: number;
  headers: Headers;
}

/**
 * The full response, for the one caller (the login action) that needs a
 * header (`Set-Cookie`) rather than just the JSON body.
 */
export async function apiRequestRaw(options: ApiRequestOptions): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${options.path}`, {
      method: options.method,
      headers: {
        "content-type": "application/json",
        cookie: options.sessionId ? `session_id=${options.sessionId}` : "",
        ...(options.clientIp ? { "x-forwarded-for": options.clientIp } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store", // clinical data must be current, never cached — see §9
    });
  } catch {
    throw new ApiUnexpectedError("Failed to reach the API");
  }
  return response;
}

/** JSON-body convenience wrapper over `apiRequestRaw` — throws a typed error for any non-2xx response. */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const response = await apiRequestRaw(options);

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiUnexpectedError("api returned a response that was not valid JSON");
  }
}
