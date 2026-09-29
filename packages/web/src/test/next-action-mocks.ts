import { vi } from "vitest";

/**
 * Shared stand-ins for the Next.js APIs every Server Action touches
 * through `lib/form-action.ts` — `redirect`/`unstable_rethrow`
 * (`next/navigation`) and `cookies` (`next/headers`, the flash). Wire
 * them in an action spec with:
 *
 *   vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
 *   vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);
 *
 * and call `resetNextActionMocks()` in `beforeEach`.
 */
export class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

export const redirectMock = vi.fn();
export const cookieSetMock = vi.fn();

export const navigationModule = {
  redirect: redirectMock,
  // Next's own contract: re-throw its control-flow signals, ignore everything else.
  unstable_rethrow: (error: unknown) => {
    if (error instanceof FakeRedirectSignal) throw error;
  },
};

export const headersModule = {
  cookies: () => Promise.resolve({ set: cookieSetMock }),
};

export function resetNextActionMocks(): void {
  redirectMock.mockReset();
  cookieSetMock.mockReset();
  redirectMock.mockImplementation((path: string) => {
    throw new FakeRedirectSignal(path);
  });
}

/** The flash key the last successful redirect set, if any. */
export function lastFlashKey(): string | undefined {
  const call = cookieSetMock.mock.calls.at(-1) as [string, string] | undefined;
  return call?.[0] === "flash" ? call[1] : undefined;
}

export function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
