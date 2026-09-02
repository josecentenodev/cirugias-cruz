import { afterEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { apiRequestRawMock } = vi.hoisted(() => ({ apiRequestRawMock: vi.fn() }));
vi.mock("@/lib/api-client.js", () => ({ apiRequestRaw: apiRequestRawMock }));

vi.mock("@/lib/client-ip.js", () => ({
  getForwardedClientIp: vi.fn().mockResolvedValue(undefined),
}));

const { setSessionCookieMock, clearSessionCookieMock, getSessionIdMock } = vi.hoisted(() => ({
  setSessionCookieMock: vi.fn(),
  clearSessionCookieMock: vi.fn(),
  getSessionIdMock: vi.fn(),
}));
vi.mock("@/lib/session.js", () => ({
  setSessionCookie: setSessionCookieMock,
  clearSessionCookie: clearSessionCookieMock,
  getSessionId: getSessionIdMock,
}));

class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}
redirectMock.mockImplementation((path: string) => {
  throw new FakeRedirectSignal(path);
});

const { loginAction, logoutAction } = await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("loginAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: sets the session cookie from api's Set-Cookie header and redirects to /patients", async () => {
    apiRequestRawMock.mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: {
          "set-cookie":
            "session_id=abc-123; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT; HttpOnly",
        },
      }),
    );

    await expect(
      loginAction({}, formData({ email: "doc@example.com", password: "s3cret" })),
    ).rejects.toThrow("NEXT_REDIRECT:/patients");

    expect(setSessionCookieMock).toHaveBeenCalledWith("abc-123", expect.any(Date));
  });

  it("rejects invalid credentials (api's 400) with an inline error, no redirect", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 400 }));

    const result = await loginAction({}, formData({ email: "doc@example.com", password: "wrong" }));

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a rate-limited attempt (429) with its own inline message", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 429 }));

    const result = await loginAction({}, formData({ email: "doc@example.com", password: "wrong" }));

    expect(result.error).toMatch(/too many attempts/i);
  });

  it("rejects a blank field before ever calling api", async () => {
    const result = await loginAction({}, formData({ email: "", password: "" }));

    expect(result).toEqual({ error: "Please enter both an email and a password." });
    expect(apiRequestRawMock).not.toHaveBeenCalled();
  });

  it("fails closed: never sets the session cookie if api's response carries no extractable session id", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 204 })); // no Set-Cookie header at all

    const result = await loginAction(
      {},
      formData({ email: "doc@example.com", password: "s3cret" }),
    );

    expect(result).toEqual({ error: "Login failed — please try again." });
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("invalidates the session on api and clears the cookie, then redirects to /login", async () => {
    getSessionIdMock.mockResolvedValue("session-abc");
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(apiRequestRawMock).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/sessions",
      sessionId: "session-abc",
    });
    expect(clearSessionCookieMock).toHaveBeenCalledTimes(1);
  });

  it("required: clears the cookie and redirects even when invalidating on api fails", async () => {
    getSessionIdMock.mockResolvedValue("session-abc");
    apiRequestRawMock.mockRejectedValue(new Error("api unreachable"));

    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(clearSessionCookieMock).toHaveBeenCalledTimes(1);
  });

  it("clears the cookie and redirects even when no session id was present", async () => {
    getSessionIdMock.mockResolvedValue(undefined);

    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(apiRequestRawMock).not.toHaveBeenCalled();
    expect(clearSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
