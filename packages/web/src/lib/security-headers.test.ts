import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  generateNonce,
} from "./security-headers.js";

describe("generateNonce", () => {
  it("returns a non-empty, base64-encoded value that differs on every call", () => {
    const a = generateNonce();
    const b = generateNonce();

    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
    expect(() => Buffer.from(a, "base64")).not.toThrow();
  });
});

describe("buildContentSecurityPolicy", () => {
  it("embeds the given nonce into script-src and stays minimal-privilege elsewhere", () => {
    const csp = buildContentSecurityPolicy("test-nonce");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/[^-]\*/); // no bare wildcard source
  });
});

describe("applySecurityHeaders", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalEnv ?? "test");
  });

  it("sets the baseline headers regardless of environment", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "n");

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
    expect(headers.get("Content-Security-Policy")).toContain("nonce-n");
  });

  it("only sets Strict-Transport-Security in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const dev = new Headers();
    applySecurityHeaders(dev, "n");
    expect(dev.get("Strict-Transport-Security")).toBeNull();

    vi.stubEnv("NODE_ENV", "production");
    const prod = new Headers();
    applySecurityHeaders(prod, "n");
    expect(prod.get("Strict-Transport-Security")).toContain("max-age=");
  });
});
