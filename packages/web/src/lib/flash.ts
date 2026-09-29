import { messages } from "@/messages/en";

/**
 * The one-shot "flash" that carries a success message across a Server
 * Action's `redirect()` (Milestone 12, design §4). Shared by the server
 * writer (`lib/form-action.ts`) and the client reader
 * (`components/Toaster.tsx`), so both agree on the cookie and on which
 * values are legal.
 *
 * Only a `FeedbackKey` ever goes in the cookie — never free text, never
 * record data — and the reader discards anything that isn't one.
 */
export const FLASH_COOKIE = "flash";

export type FeedbackKey = Exclude<keyof typeof messages.feedback, "notifications" | "dismiss">;

export function isFeedbackKey(value: string): value is FeedbackKey {
  return (
    value !== "notifications" &&
    value !== "dismiss" &&
    Object.prototype.hasOwnProperty.call(messages.feedback, value)
  );
}

/** Reads the flash key out of a `document.cookie`-style string; `undefined` if absent or not a known key. */
export function readFlashKey(cookieHeader: string): FeedbackKey | undefined {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === FLASH_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return isFeedbackKey(value) ? value : undefined;
    }
  }
  return undefined;
}
