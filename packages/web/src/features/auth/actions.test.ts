import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { apiRequestRawMock, apiRequestMock } = vi.hoisted(() => ({
  apiRequestRawMock: vi.fn(),
  apiRequestMock: vi.fn(),
}));
vi.mock("@/lib/api-client.js", () => ({
  apiRequestRaw: apiRequestRawMock,
  apiRequest: apiRequestMock,
}));

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

const { loginAction, logoutAction, registerAction } = await import("./actions.js");

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
      new Response(JSON.stringify({ userType: "physician" }), {
        status: 200,
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

  it("falls back to the physician redirect when the success body is empty/unparseable (ADR 0017)", async () => {
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
  });

  it("resident login, must change password: redirects to /resident/change-password (ADR 0017)", async () => {
    apiRequestRawMock.mockResolvedValue(
      new Response(JSON.stringify({ userType: "resident", mustChangePassword: true }), {
        status: 200,
        headers: {
          "set-cookie":
            "session_id=abc-123; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT; HttpOnly",
        },
      }),
    );

    await expect(
      loginAction({}, formData({ email: "resident@example.com", password: "temp-pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/change-password");
  });

  it("resident login, already changed: redirects to /resident/surgeries (ADR 0017)", async () => {
    apiRequestRawMock.mockResolvedValue(
      new Response(JSON.stringify({ userType: "resident", mustChangePassword: false }), {
        status: 200,
        headers: {
          "set-cookie":
            "session_id=abc-123; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT; HttpOnly",
        },
      }),
    );

    await expect(
      loginAction({}, formData({ email: "resident@example.com", password: "my-own-pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries");
  });

  it("rejects invalid credentials (api's 400, no parseable body) with a generic fallback, no redirect", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 400 }));

    const result = await loginAction({}, formData({ email: "doc@example.com", password: "wrong" }));

    expect(result).toEqual({ error: "Invalid email or password." });
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("passes through api's actual DomainError message from the response body, unchanged (ADR 0015: the unconfirmed-email case needs its own distinct message, not a generic one)", async () => {
    apiRequestRawMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Please confirm your email before logging in" }), {
        status: 400,
      }),
    );

    const result = await loginAction(
      {},
      formData({ email: "doc@example.com", password: "s3cret" }),
    );

    expect(result).toEqual({ error: "Please confirm your email before logging in" });
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

function registerFormData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields: Record<string, string> = {
    firstName: "Ana",
    lastName: "García",
    phone: "555-0101",
    email: "ana@example.com",
    dateOfBirth: "1980-01-01",
    password: "s3cret-password",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("registerAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /physicians and redirects to /signup/check-email, never sets a session cookie", async () => {
    apiRequestMock.mockResolvedValue({ physicianId: "physician-1" });

    await expect(registerAction({}, registerFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/signup/check-email",
    );

    expect(apiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/physicians",
      body: {
        firstName: "Ana",
        lastName: "García",
        phone: "555-0101",
        email: "ana@example.com",
        dateOfBirth: "1980-01-01",
        password: "s3cret-password",
      },
    });
    expect(setSessionCookieMock).not.toHaveBeenCalled();
  });

  it("rejects a blank field before ever calling api", async () => {
    const result = await registerAction({}, registerFormData({ firstName: "" }));

    expect(result).toEqual({ error: "Please fill in every field." });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline (e.g. email already registered), unchanged", async () => {
    apiRequestMock.mockRejectedValue(
      new ApiDomainError("A physician with this email is already registered"),
    );

    const result = await registerAction({}, registerFormData());

    expect(result).toEqual({ error: "A physician with this email is already registered" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    apiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(registerAction({}, registerFormData())).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});
