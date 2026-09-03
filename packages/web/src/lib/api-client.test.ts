import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, apiRequestRaw } from "./api-client.js";
import { ApiDomainError, ApiUnexpectedError } from "./api-errors.js";

describe("apiRequest / apiRequestRaw", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "http://api.internal";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it("builds the request with the session cookie, forwarded IP, and no-store caching", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest({
      method: "GET",
      path: "/patients",
      sessionId: "session-abc",
      clientIp: "203.0.113.5",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.internal/patients");
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    const headers = init.headers as Record<string, string>;
    expect(headers.cookie).toBe("session_id=session-abc");
    expect(headers["x-forwarded-for"]).toBe("203.0.113.5");
  });

  it("sends an empty cookie header when no session id is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest({ method: "POST", path: "/sessions", body: { email: "a", password: "b" } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.cookie).toBe("");
    expect(init.body).toBe(JSON.stringify({ email: "a", password: "b" }));
  });

  it("sets content-type: application/json when a body is sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest({ method: "POST", path: "/sessions", body: { email: "a", password: "b" } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
  });

  it("omits content-type entirely for a bodyless request — Fastify's default JSON parser rejects an empty body declared as application/json", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest({ method: "POST", path: "/residents/resident-1/password-reset" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("returns undefined for a 204 response without attempting to parse a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    const result = await apiRequest({ method: "DELETE", path: "/sessions" });

    expect(result).toBeUndefined();
  });

  it("returns the parsed JSON body for a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ patientId: "p1" }), { status: 201 })),
    );

    const result = await apiRequest<{ patientId: string }>({ method: "POST", path: "/patients" });

    expect(result).toEqual({ patientId: "p1" });
  });

  it("throws the typed error for a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "bad" }), { status: 400 })),
    );

    await expect(apiRequest({ method: "POST", path: "/patients" })).rejects.toBeInstanceOf(
      ApiDomainError,
    );
  });

  it("throws ApiUnexpectedError when the network request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(apiRequestRaw({ method: "GET", path: "/patients" })).rejects.toBeInstanceOf(
      ApiUnexpectedError,
    );
  });

  it("throws ApiUnexpectedError when a successful response body is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));

    await expect(apiRequest({ method: "GET", path: "/patients" })).rejects.toBeInstanceOf(
      ApiUnexpectedError,
    );
  });
});
