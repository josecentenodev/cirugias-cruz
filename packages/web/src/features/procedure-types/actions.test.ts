import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}
redirectMock.mockImplementation((path: string) => {
  throw new FakeRedirectSignal(path);
});

const { addCustomFieldAction, modifyProcedureTypeAction, registerProcedureTypeAction } =
  await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("registerProcedureTypeAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /procedure-types through authedApiRequest and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(registerProcedureTypeAction({}, formData({ name: "Pterigión" }))).rejects.toThrow(
      "NEXT_REDIRECT:/settings/procedure-types",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("omits optional fields when left blank, rather than sending empty strings", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      registerProcedureTypeAction(
        {},
        formData({ name: "Pterigión", description: "", technique: "" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("rejects a missing name before ever calling api", async () => {
    const result = await registerProcedureTypeAction({}, formData({ name: "" }));

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("ProcedureType requires a name"));

    const result = await registerProcedureTypeAction({}, formData({ name: "Pterigión" }));

    expect(result).toEqual({ error: "ProcedureType requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      registerProcedureTypeAction({}, formData({ name: "Pterigión" })),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

describe("modifyProcedureTypeAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls PATCH /procedure-types/:id and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      modifyProcedureTypeAction("pt-1", {}, formData({ technique: "Amniotic membrane" })),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/procedure-types/pt-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/procedure-types/pt-1",
      body: { technique: "Amniotic membrane" },
    });
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("ProcedureType requires a name"));

    const result = await modifyProcedureTypeAction("pt-1", {}, formData({ name: "" }));

    expect(result).toEqual({ error: "ProcedureType requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("propagates NotFoundError as an inline error", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiNotFoundError("Procedure type pt-1 was not found"),
    );

    const result = await modifyProcedureTypeAction("pt-1", {}, formData({ name: "Renamed" }));

    expect(result).toEqual({ error: "Procedure type pt-1 was not found" });
  });
});

describe("addCustomFieldAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: adds a NUMBER-constrained field and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1", customFieldId: "cf-1" });

    await expect(
      addCustomFieldAction(
        "pt-1",
        {},
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
        {},
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
      {},
      formData({
        valueType: "NUMBER",
        name: "",
        unit: "0-10",
        scope: "CONTROL",
      }),
    );

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("rejects an ENUM field with zero options before ever calling api", async () => {
    const result = await addCustomFieldAction(
      "pt-1",
      {},
      formData({
        valueType: "ENUM",
        name: "Technique",
        scope: "SURGERY",
        options: "",
      }),
    );

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError('ProcedureType already has a CustomField named "Pain (EVA)"'),
    );

    const result = await addCustomFieldAction(
      "pt-1",
      {},
      formData({
        valueType: "NUMBER",
        name: "Pain (EVA)",
        unit: "0-10",
        scope: "CONTROL",
      }),
    );

    expect(result).toEqual({ error: 'ProcedureType already has a CustomField named "Pain (EVA)"' });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
