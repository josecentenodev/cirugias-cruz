import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const {
  addControlDefinitionAction,
  addCustomFieldAction,
  modifyProcedureTypeAction,
  registerProcedureTypeAction,
} = await import("./actions.js");

describe("registerProcedureTypeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: calls POST /procedure-types through authedApiRequest and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      registerProcedureTypeAction(idleResult, formData({ name: "Pterigión" })),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("omits optional fields when left blank, rather than sending empty strings", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      registerProcedureTypeAction(idleResult, formData({ name: "Pterigión", description: "" })),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("rejects a missing name before ever calling api", async () => {
    const result = await registerProcedureTypeAction(idleResult, formData({ name: "" }));

    expect(result).toMatchObject({
      status: "error",
      message: "Please fill in every required field.",
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("A procedure type requires a name"));

    const result = await registerProcedureTypeAction(idleResult, formData({ name: "Pterigión" }));

    expect(result).toMatchObject({ status: "error", message: "A procedure type requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: is shown inline as the generic message — the form survives", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await registerProcedureTypeAction(idleResult, formData({ name: "Pterigión" })),
    ).toMatchObject({
      status: "error",
      message: messages.errors.unexpected,
    });
  });
});

describe("modifyProcedureTypeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: calls PATCH /procedure-types/:id and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      modifyProcedureTypeAction(
        "pt-1",
        idleResult,
        formData({ description: "vía subconjuntival" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types/pt-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/procedure-types/pt-1",
      body: { description: "vía subconjuntival" },
    });
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("A procedure type requires a name"));

    const result = await modifyProcedureTypeAction("pt-1", idleResult, formData({ name: "" }));

    expect(result).toMatchObject({ status: "error", message: "A procedure type requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("propagates NotFoundError as an inline error", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiNotFoundError("This procedure type was not found"),
    );

    const result = await modifyProcedureTypeAction(
      "pt-1",
      idleResult,
      formData({ name: "Renamed" }),
    );

    expect(result).toMatchObject({ status: "error", message: "This procedure type was not found" });
  });
});

describe("addCustomFieldAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: adds a NUMBER-constrained field and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1", customFieldId: "cf-1" });

    await expect(
      addCustomFieldAction(
        "pt-1",
        idleResult,
        formData({
          valueType: "NUMBER",
          name: "Pain (EVA)",
          unit: "0-10",
          scope: "CONTROL",
          min: "0",
          max: "10",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types/pt-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types/pt-1/custom-fields",
      body: {
        name: "Pain (EVA)",
        description: undefined,
        scope: "CONTROL",
        constraint: { valueType: "NUMBER", unit: "0-10", min: 0, max: 10 },
      },
    });
  });

  it("succeeds: splits ENUM options by line, trimming blanks", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1", customFieldId: "cf-2" });

    await expect(
      addCustomFieldAction(
        "pt-1",
        idleResult,
        formData({
          valueType: "ENUM",
          name: "Surgical technique",
          scope: "SURGERY",
          options: "Autograft\n\nAmniotic membrane\n",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types/pt-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types/pt-1/custom-fields",
      body: {
        name: "Surgical technique",
        description: undefined,
        scope: "SURGERY",
        constraint: { valueType: "ENUM", options: ["Autograft", "Amniotic membrane"] },
      },
    });
  });

  it("rejects a missing required field before ever calling api", async () => {
    const result = await addCustomFieldAction(
      "pt-1",
      idleResult,
      formData({
        valueType: "NUMBER",
        name: "",
        unit: "0-10",
        scope: "CONTROL",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Please fill in every required field.",
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("rejects an ENUM field with zero options before ever calling api", async () => {
    const result = await addCustomFieldAction(
      "pt-1",
      idleResult,
      formData({
        valueType: "ENUM",
        name: "Technique",
        scope: "SURGERY",
        options: "",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Please fill in every required field.",
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError('This procedure type already has a custom field named "Pain (EVA)"'),
    );

    const result = await addCustomFieldAction(
      "pt-1",
      idleResult,
      formData({
        valueType: "NUMBER",
        name: "Pain (EVA)",
        unit: "0-10",
        scope: "CONTROL",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: 'This procedure type already has a custom field named "Pain (EVA)"',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("addControlDefinitionAction — scheduled timepoints (ADR 0031)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("sends the typed timepoints as integer offsets in the chosen unit", async () => {
    authedApiRequestMock.mockResolvedValue({ controlDefinitionId: "def-1" });

    await expect(
      addControlDefinitionAction(
        "pt-1",
        idleResult,
        formData({ name: "Postop visits", mode: "scheduled", timepoints: "1, 3 7", unit: "days" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types/pt-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types/pt-1/control-definitions",
      body: {
        name: "Postop visits",
        occurrenceRule: { mode: "scheduled", unit: "days", offsets: [1, 3, 7] },
      },
    });
  });

  it("rejects unparseable timepoints on the field itself, before calling api", async () => {
    const result = await addControlDefinitionAction(
      "pt-1",
      idleResult,
      formData({ name: "Postop visits", mode: "scheduled", timepoints: "1, tres", unit: "days" }),
    );

    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { timepoints: "Enter whole numbers separated by commas, e.g. 1, 3, 7" },
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("rejects an empty timepoints field", async () => {
    const result = await addControlDefinitionAction(
      "pt-1",
      idleResult,
      formData({ name: "Postop visits", mode: "scheduled", timepoints: "", unit: "days" }),
    );

    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { timepoints: "Enter whole numbers separated by commas, e.g. 1, 3, 7" },
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("surfaces api's Domain rejection (e.g. a repeated timepoint) inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A timepoint cannot be listed more than once"),
    );

    const result = await addControlDefinitionAction(
      "pt-1",
      idleResult,
      formData({ name: "Postop visits", mode: "scheduled", timepoints: "1, 3, 3", unit: "days" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "A timepoint cannot be listed more than once",
    });
  });
});
