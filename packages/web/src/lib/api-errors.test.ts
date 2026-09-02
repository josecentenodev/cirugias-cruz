import { describe, expect, it } from "vitest";
import {
  ApiAuthError,
  ApiDomainError,
  ApiNotFoundError,
  ApiRateLimitedError,
  ApiUnexpectedError,
  toApiError,
} from "./api-errors.js";

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body !== undefined ? JSON.stringify(body) : undefined, { status });
}

describe("toApiError", () => {
  it("maps 401 to ApiAuthError", async () => {
    const error = await toApiError(jsonResponse(401, { error: "Not authenticated" }));
    expect(error).toBeInstanceOf(ApiAuthError);
    expect(error.message).toBe("Not authenticated");
  });

  it("maps 404 to ApiNotFoundError, carrying api's message", async () => {
    const error = await toApiError(jsonResponse(404, { error: "Patient x was not found" }));
    expect(error).toBeInstanceOf(ApiNotFoundError);
    expect(error.message).toBe("Patient x was not found");
  });

  it("maps 400 to ApiDomainError, carrying api's DomainError message as-is", async () => {
    const error = await toApiError(jsonResponse(400, { error: "firstName is required" }));
    expect(error).toBeInstanceOf(ApiDomainError);
    expect(error.message).toBe("firstName is required");
  });

  it("maps 429 to ApiRateLimitedError", async () => {
    const error = await toApiError(jsonResponse(429));
    expect(error).toBeInstanceOf(ApiRateLimitedError);
  });

  it("maps any other status to ApiUnexpectedError", async () => {
    const error = await toApiError(jsonResponse(500, { error: "Internal server error" }));
    expect(error).toBeInstanceOf(ApiUnexpectedError);
  });

  it("does not throw when the body is not valid JSON", async () => {
    const response = new Response("not json", { status: 500 });
    const error = await toApiError(response);
    expect(error).toBeInstanceOf(ApiUnexpectedError);
  });
});
