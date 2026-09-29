import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ApiAuthError,
  ApiDomainError,
  ApiNotFoundError,
  ApiRateLimitedError,
  ApiUnexpectedError,
} from "./api-errors.js";
import { messages } from "@/messages/en";

class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

const { redirectMock, rethrowMock, cookieSetMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  rethrowMock: vi.fn(),
  cookieSetMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock, unstable_rethrow: rethrowMock }));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve({ set: cookieSetMock }) }));

function installNextMocks() {
  redirectMock.mockImplementation((path: string) => {
    throw new FakeRedirectSignal(path);
  });
  // Mirrors Next's own contract: re-throw its control-flow signals, ignore everything else.
  rethrowMock.mockImplementation((error: unknown) => {
    if (error instanceof FakeRedirectSignal) throw error;
  });
}

const { runFormAction } = await import("./form-action.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const fails = (error: Error) => () => Promise.reject(error);
const succeeds =
  <T>(value: T) =>
  () =>
    Promise.resolve(value);

const nameSchema = z.object({ name: z.string().trim().min(1, "Name is required") });
const nameInput = (fd: FormData) => ({ name: fd.get("name") });

describe("runFormAction", () => {
  beforeEach(installNextMocks);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validation", () => {
    it("returns field errors plus the form-level message, without calling run", async () => {
      const run = vi.fn();
      const result = await runFormAction(formData({ name: "  " }), {
        schema: nameSchema,
        input: nameInput,
        invalidMessage: "Please fix the form.",
        run,
      });

      expect(run).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: "error",
        message: "Please fix the form.",
        fieldErrors: { name: "Name is required" },
      });
    });

    it("defaults the form-level message to the shared required-fields copy", async () => {
      const result = await runFormAction(formData({ name: "" }), {
        schema: nameSchema,
        input: nameInput,
        run: vi.fn(),
      });
      expect(result).toMatchObject({ status: "error", message: messages.errors.requiredFields });
    });

    it("replaces Zod's raw type error for a missing field with readable copy", async () => {
      const result = await runFormAction(new FormData(), {
        schema: nameSchema,
        input: nameInput,
        run: vi.fn(),
      });
      expect(result).toMatchObject({ fieldErrors: { name: messages.errors.fieldRequired } });
    });

    it("hands the parsed (trimmed) data to run", async () => {
      const run = vi.fn().mockResolvedValue(undefined);
      await runFormAction(formData({ name: "  Ana  " }), {
        schema: nameSchema,
        input: nameInput,
        run,
      });
      expect(run).toHaveBeenCalledWith({ name: "Ana" });
    });
  });

  describe("echoing submitted values on error", () => {
    it("echoes every string field so the form can repopulate", async () => {
      const result = await runFormAction(formData({ name: "", email: "a@b.c" }), {
        schema: nameSchema,
        input: nameInput,
        run: vi.fn(),
      });
      expect(result).toMatchObject({ values: { name: "", email: "a@b.c" } });
    });

    it("never echoes a password field, whatever its exact name", async () => {
      const result = await runFormAction(
        formData({ email: "a@b.c", password: "s3cret", newPassword: "n3w" }),
        {
          run: fails(new ApiDomainError("Invalid email or password")),
        },
      );
      expect(result.status).toBe("error");
      const values = result.status === "error" ? result.values : undefined;
      expect(values).toEqual({ email: "a@b.c" });
    });

    it("never echoes explicitly sensitive fields or Next's internal $ACTION fields", async () => {
      const result = await runFormAction(
        formData({ token: "t0k3n", keep: "yes", $ACTION_ID_abc: "" }),
        {
          sensitiveFields: ["token"],
          run: fails(new ApiDomainError("nope")),
        },
      );
      const values = result.status === "error" ? result.values : undefined;
      expect(values).toEqual({ keep: "yes" });
    });
  });

  describe("errors thrown by run", () => {
    it("shows an ApiDomainError's message verbatim", async () => {
      const result = await runFormAction(formData({}), {
        run: fails(new ApiDomainError("cannot complete a research study that is not IN_PROGRESS")),
      });
      expect(result).toMatchObject({
        status: "error",
        message: "cannot complete a research study that is not IN_PROGRESS",
      });
    });

    it("shows an ApiNotFoundError's message verbatim", async () => {
      const result = await runFormAction(formData({}), {
        run: fails(new ApiNotFoundError("Surgery not found")),
      });
      expect(result).toMatchObject({ status: "error", message: "Surgery not found" });
    });

    it("phrases a rate limit in the app's own words", async () => {
      const result = await runFormAction(formData({}), {
        run: fails(new ApiRateLimitedError("Rate limit exceeded, retry in 1 minute")),
      });
      expect(result).toMatchObject({ status: "error", message: messages.errors.rateLimited });
    });

    it("turns an unexpected failure into the generic inline message and logs it", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await runFormAction(formData({ name: "Ana" }), {
        run: fails(new ApiUnexpectedError("api responded 500")),
      });

      expect(result).toMatchObject({ status: "error", message: messages.errors.unexpected });
      expect(log).toHaveBeenCalledOnce();
      // Logged by class + message only — never the submitted (clinical) form data.
      expect(JSON.stringify(log.mock.calls)).not.toContain("Ana");
    });

    it("treats a plain bug (TypeError) as unexpected too, never leaking its message", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await runFormAction(formData({}), {
        run: fails(new TypeError("Cannot read properties of undefined (reading 'id')")),
      });
      expect(result).toMatchObject({ status: "error", message: messages.errors.unexpected });
    });

    it("treats an ApiAuthError reaching it (unauthenticated call) as unexpected", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await runFormAction(formData({}), {
        run: fails(new ApiAuthError()),
      });
      expect(result).toMatchObject({ status: "error", message: messages.errors.unexpected });
    });

    it("re-throws Next's control-flow signals (e.g. the session-expired redirect) instead of swallowing them", async () => {
      await expect(
        runFormAction(formData({}), {
          run: fails(new FakeRedirectSignal("/login?reason=session-expired")),
        }),
      ).rejects.toMatchObject({ path: "/login?reason=session-expired" });
    });

    it("gives every result a fresh id, so the same error twice still reports twice", async () => {
      const failing = {
        run: fails(new ApiDomainError("same")),
      };
      const first = await runFormAction(formData({}), failing);
      const second = await runFormAction(formData({}), failing);
      expect(first.status === "error" && second.status === "error").toBe(true);
      if (first.status === "error" && second.status === "error") {
        expect(first.id).not.toBe(second.id);
      }
    });
  });

  describe("success", () => {
    it("with a redirect: sets the one-shot flash key, then redirects", async () => {
      await expect(
        runFormAction(formData({}), {
          run: () => Promise.resolve({ patientId: "p-1" }),
          success: (out) => ({
            message: "patientRegistered",
            redirectTo: `/patients/${out.patientId}`,
          }),
        }),
      ).rejects.toMatchObject({ path: "/patients/p-1" });

      expect(cookieSetMock).toHaveBeenCalledOnce();
      const [name, value, options] = cookieSetMock.mock.calls[0] as [
        string,
        string,
        Record<string, unknown>,
      ];
      expect([name, value]).toEqual(["flash", "patientRegistered"]);
      expect(options).toMatchObject({ path: "/", httpOnly: false });
      expect(typeof options.maxAge).toBe("number");
    });

    it("with a redirect and no message: redirects without a flash", async () => {
      await expect(
        runFormAction(formData({}), {
          run: succeeds(undefined),
          success: { redirectTo: "/login" },
        }),
      ).rejects.toMatchObject({ path: "/login" });
      expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("without a redirect: returns the resolved message for an in-place toast", async () => {
      const result = await runFormAction(formData({}), {
        run: succeeds(undefined),
        success: { message: "invitationResent" },
      });
      expect(result).toMatchObject({
        status: "success",
        message: messages.feedback.invitationResent,
      });
      expect(cookieSetMock).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("does not treat the success redirect as a failure", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        runFormAction(formData({}), { run: succeeds(undefined), success: { redirectTo: "/x" } }),
      ).rejects.toBeInstanceOf(FakeRedirectSignal);
      expect(log).not.toHaveBeenCalled();
    });
  });
});
