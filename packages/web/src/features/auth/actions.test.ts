import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

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

const { loginAction, logoutAction, registerAction } = await import("./actions.js");

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
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
      loginAction(idleResult, formData({ email: "doc@example.com", password: "s3cret" })),
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
      loginAction(idleResult, formData({ email: "doc@example.com", password: "s3cret" })),
    ).rejects.toThrow("NEXT_REDIRECT:/patients");
  });

  it("resident login redirects to /resident/surgeries (ADR 0029 — no forced first-login change anymore)", async () => {
    apiRequestRawMock.mockResolvedValue(
      new Response(JSON.stringify({ userType: "resident" }), {
        status: 200,
        headers: {
          "set-cookie":
            "session_id=abc-123; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT; HttpOnly",
        },
      }),
    );

    await expect(
      loginAction(idleResult, formData({ email: "resident@example.com", password: "my-own-pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries");
  });

  it("rejects invalid credentials (api's 400, no parseable body) with a generic fallback, no redirect", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 400 }));

    const result = await loginAction(
      idleResult,
      formData({ email: "doc@example.com", password: "wrong" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Invalid email or password.",
      values: { email: "doc@example.com" },
    });
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
      idleResult,
      formData({ email: "doc@example.com", password: "s3cret" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Please confirm your email before logging in",
      values: { email: "doc@example.com" },
    });
  });

  it("rejects a rate-limited attempt (429) with its own inline message", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 429 }));

    const result = await loginAction(
      idleResult,
      formData({ email: "doc@example.com", password: "wrong" }),
    );

    expect(result).toMatchObject({ status: "error", message: messages.errors.rateLimited });
  });

  it("rejects a blank field before ever calling api", async () => {
    const result = await loginAction(idleResult, formData({ email: "", password: "" }));

    expect(result).toMatchObject({
      status: "error",
      message: "Please enter both an email and a password.",
      values: { email: "" },
    });
    expect(apiRequestRawMock).not.toHaveBeenCalled();
  });

  it("fails closed: never sets the session cookie if api's response carries no extractable session id", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 204 })); // no Set-Cookie header at all

    const result = await loginAction(
      idleResult,
      formData({ email: "doc@example.com", password: "s3cret" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Login failed — please try again.",
      values: { email: "doc@example.com" },
    });
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
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
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: calls POST /physicians and redirects to /signup/check-email, never sets a session cookie", async () => {
    apiRequestMock.mockResolvedValue({ physicianId: "physician-1" });

    await expect(registerAction(idleResult, registerFormData())).rejects.toThrow(
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
    const result = await registerAction(idleResult, registerFormData({ firstName: "" }));

    expect(result).toMatchObject({
      status: "error",
      message: "Please fill in every field.",
      values: {
        firstName: "",
        lastName: "García",
        phone: "555-0101",
        email: "ana@example.com",
        dateOfBirth: "1980-01-01",
      },
    });
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline (e.g. email already registered), unchanged", async () => {
    apiRequestMock.mockRejectedValue(
      new ApiDomainError("A physician with this email is already registered"),
    );

    const result = await registerAction(idleResult, registerFormData());

    expect(result).toMatchObject({
      status: "error",
      message: "A physician with this email is already registered",
      values: {
        firstName: "Ana",
        lastName: "García",
        phone: "555-0101",
        email: "ana@example.com",
        dateOfBirth: "1980-01-01",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: is shown inline as the generic message — the form survives", async () => {
    apiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await registerAction(idleResult, registerFormData())).toMatchObject({
      status: "error",
      message: messages.errors.unexpected,
    });
  });
});

describe("password fields are never echoed back", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("a rejected login repopulates the email only", async () => {
    apiRequestRawMock.mockResolvedValue(new Response(null, { status: 400 }));

    const result = await loginAction(
      idleResult,
      formData({ email: "doc@example.com", password: "hunter2" }),
    );

    expect(result.status === "error" ? result.values : undefined).toEqual({
      email: "doc@example.com",
    });
  });
});
