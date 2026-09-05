import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiAuthError, ApiDomainError } from "./api-errors.js";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("./api-client.js", () => ({
  apiRequest: apiRequestMock,
}));

const { getSessionIdMock } = vi.hoisted(() => ({ getSessionIdMock: vi.fn() }));
vi.mock("./session.js", () => ({
  getSessionId: getSessionIdMock,
}));

vi.mock("./client-ip.js", () => ({
  getForwardedClientIp: vi.fn().mockResolvedValue("203.0.113.5"),
}));

// `redirect()` in real Next.js throws a special digest error and never
// returns — mirror that here so a caller that doesn't handle it
// propagates, exactly like the real thing.
class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}
redirectMock.mockImplementation((path: string) => {
  throw new FakeRedirectSignal(path);
});

const { authedApiRequest } = await import("./authed-api-request.js");

describe("authedApiRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("redirects to /login?reason=session-expired without calling api when no session id exists — fail closed", async () => {
    getSessionIdMock.mockResolvedValue(undefined);

    await expect(authedApiRequest({ method: "GET", path: "/patients" })).rejects.toThrow(
      "NEXT_REDIRECT:/login?reason=session-expired",
    );
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("forwards the session id and client IP, and returns api's result", async () => {
    getSessionIdMock.mockResolvedValue("session-abc");
    apiRequestMock.mockResolvedValue([{ id: "p1" }]);

    const result = await authedApiRequest({ method: "GET", path: "/patients" });

    expect(result).toEqual([{ id: "p1" }]);
    expect(apiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/patients",
      sessionId: "session-abc",
      clientIp: "203.0.113.5",
    });
  });

  it("redirects to /login?reason=session-expired when api reports the session is invalid (401)", async () => {
    getSessionIdMock.mockResolvedValue("stale-session");
    apiRequestMock.mockRejectedValue(new ApiAuthError());

    await expect(authedApiRequest({ method: "GET", path: "/patients" })).rejects.toThrow(
      "NEXT_REDIRECT:/login?reason=session-expired",
    );
  });

  it("does not redirect on a domain error — lets it propagate for the caller to handle", async () => {
    getSessionIdMock.mockResolvedValue("session-abc");
    apiRequestMock.mockRejectedValue(new ApiDomainError("firstName is required"));

    await expect(authedApiRequest({ method: "POST", path: "/patients" })).rejects.toBeInstanceOf(
      ApiDomainError,
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
