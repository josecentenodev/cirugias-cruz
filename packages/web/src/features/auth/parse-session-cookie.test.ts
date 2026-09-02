import { describe, expect, it } from "vitest";
import { parseSessionCookie } from "./parse-session-cookie.js";

describe("parseSessionCookie", () => {
  it("extracts the session id and expiry from a well-formed Set-Cookie header", () => {
    const result = parseSessionCookie(
      "session_id=abc-123; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT; HttpOnly; SameSite=Lax",
    );

    expect(result).toBeDefined();
    expect(result?.sessionId).toBe("abc-123");
    expect(result?.expiresAt.toISOString()).toBe(
      new Date("2025-10-02T12:00:00.000Z").toISOString(),
    );
  });

  it("returns undefined when the header is null — fail closed", () => {
    expect(parseSessionCookie(null)).toBeUndefined();
  });

  it("returns undefined when the cookie name is not session_id", () => {
    expect(
      parseSessionCookie("other_cookie=value; Path=/; Expires=Thu, 02 Oct 2025 12:00:00 GMT"),
    ).toBeUndefined();
  });

  it("returns undefined when there is no value after the '='", () => {
    expect(parseSessionCookie("session_id=; Path=/")).toBeUndefined();
  });

  it("returns undefined when there is no Expires attribute", () => {
    expect(parseSessionCookie("session_id=abc-123; Path=/; HttpOnly")).toBeUndefined();
  });

  it("returns undefined when Expires is not a parseable date", () => {
    expect(parseSessionCookie("session_id=abc-123; Expires=not-a-date")).toBeUndefined();
  });
});
