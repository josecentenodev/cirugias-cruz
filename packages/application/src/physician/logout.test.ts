import { describe, expect, it } from "vitest";
import { InMemorySessionRepository } from "../testing/fakes.js";
import { logout } from "./logout.js";

describe("logout", () => {
  it("invalidates an existing session", async () => {
    const sessionRepository = new InMemorySessionRepository();
    const session = await sessionRepository.create({
      userType: "physician",
      physicianId: "physician-1",
    });

    await logout({ sessionRepository })({ sessionId: session.id });

    await expect(sessionRepository.findById(session.id)).resolves.toBeNull();
  });

  it("is a no-op for a session that does not exist", async () => {
    const sessionRepository = new InMemorySessionRepository();

    await expect(logout({ sessionRepository })({ sessionId: "unknown" })).resolves.toBeUndefined();
  });
});
