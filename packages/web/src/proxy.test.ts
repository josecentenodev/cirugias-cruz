import { describe, expect, it } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
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

  it("never redirects /signup or its /signup/check-email sub-page (ADR 0015)", () => {
    expect(proxy(request("/signup")).headers.get("location")).toBeNull();
    expect(proxy(request("/signup/check-email")).headers.get("location")).toBeNull();
  });

  it("never redirects /confirm-email, even with a ?token= query string", () => {
    const response = proxy(request("/confirm-email?token=abc-123"));

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

describe("proxy (security headers)", () => {
  it("sets a Content-Security-Policy with a fresh nonce on a pass-through response", () => {
    const response = proxy(request("/patients", "web_session=abc-123"));

    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  });

  it("uses a different nonce on every request", () => {
    const first = proxy(request("/patients", "web_session=abc-123"));
    const second = proxy(request("/patients", "web_session=abc-123"));

    const nonceOf = (response: NextResponse) =>
      /nonce-([^']+)/.exec(response.headers.get("Content-Security-Policy") ?? "")?.[1];

    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it("applies the same security headers to a redirect response, not only pass-through ones", () => {
    const response = proxy(request("/patients"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets the other baseline headers (nosniff, referrer policy, permissions policy)", () => {
    const response = proxy(request("/login"));

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
