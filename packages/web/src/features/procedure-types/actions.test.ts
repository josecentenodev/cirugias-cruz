import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { addCustomFieldAction, modifyProcedureTypeAction, registerProcedureTypeAction } =
  await import("./actions.js");

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
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("ProcedureType requires a name"));

    const result = await registerProcedureTypeAction(idleResult, formData({ name: "Pterigión" }));

    expect(result).toMatchObject({ status: "error", message: "ProcedureType requires a name" });
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
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("ProcedureType requires a name"));

    const result = await modifyProcedureTypeAction("pt-1", idleResult, formData({ name: "" }));

    expect(result).toMatchObject({ status: "error", message: "ProcedureType requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("propagates NotFoundError as an inline error", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiNotFoundError("Procedure type pt-1 was not found"),
    );

    const result = await modifyProcedureTypeAction(
      "pt-1",
      idleResult,
      formData({ name: "Renamed" }),
    );

    expect(result).toMatchObject({ status: "error", message: "Procedure type pt-1 was not found" });
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
      new ApiDomainError('ProcedureType already has a CustomField named "Pain (EVA)"'),
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
      message: 'ProcedureType already has a CustomField named "Pain (EVA)"',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
