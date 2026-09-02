import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy.js";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3001"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy (route protection)", () => {
  it("redirects to /login when no web_session cookie is present", () => {
    const response = proxy(request("/patients"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3001/login");
  });

  it("lets the request through when a web_session cookie is present — validity is api's call, not this proxy's", () => {
    const response = proxy(request("/patients", "web_session=abc-123"));

    // NextResponse.next() carries the special x-middleware-next marker
    // rather than a redirect status — absence of a redirect is what
    // "let through" means here.
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects /login itself, even without a session cookie", () => {
    const response = proxy(request("/login"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not check session validity itself — a present-but-stale cookie still passes through", () => {
    // Deliberately not authedApiRequest's job here — see
    // docs/architecture/milestone-8-design.md §3.2: this proxy only
    // checks cookie *presence*.
    const response = proxy(request("/patients", "web_session=stale-or-invalid-value"));

    expect(response.headers.get("location")).toBeNull();
  });
});
