"use client";

import { Toast } from "@base-ui/react/toast";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CheckCircleIcon } from "@/components/ui/icons";
import { FLASH_COOKIE, readFlashKey } from "@/lib/flash";
import { messages } from "@/messages/en";

/**
 * The app's single toast surface (Milestone 12, design §4) — mounted
 * once in `app/layout.tsx`. Success feedback only: errors stay inline
 * next to the form that produced them (`components/ActionForm.tsx`).
 *
 * Top-center with a solid success fill (white on `--success`, AA) and a
 * lifted shadow: a pale bottom-corner toast went unnoticed in manual
 * testing (2026-09-30), and a confirmation nobody sees is no feedback.
 *
 * A module-level manager (Base UI's `createToastManager`) so
 * `showSuccessToast` works from any client code without prop-drilling.
 */
const toastManager = Toast.createToastManager();

/** Fired by `useFormAction` whenever a submission settles — see `consumeFlash`. */
const FLASH_CHECK_EVENT = "app:flash-check";

export function showSuccessToast(message: string): void {
  toastManager.add({ title: message, type: "success" });
}

export function requestFlashCheck(): void {
  window.dispatchEvent(new Event(FLASH_CHECK_EVENT));
}

/**
 * Shows, then deletes, the one-shot flash a Server Action set right
 * before redirecting (`lib/form-action.ts`). Checked on every route
 * change AND whenever a form submission settles: many actions redirect
 * back to the page they were submitted from, where the pathname doesn't
 * change and a route-change effect alone would never fire.
 */
function consumeFlash(): void {
  if (!document.cookie.includes(`${FLASH_COOKIE}=`)) return;
  const key = readFlashKey(document.cookie);
  document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
  if (key) showSuccessToast(messages.feedback[key]);
}

export function Toaster() {
  const pathname = usePathname();

  useEffect(() => {
    consumeFlash();
  }, [pathname]);

  useEffect(() => {
    window.addEventListener(FLASH_CHECK_EVENT, consumeFlash);
    return () => window.removeEventListener(FLASH_CHECK_EVENT, consumeFlash);
  }, []);

  return (
    <Toast.Provider toastManager={toastManager} timeout={4000}>
      <Toast.Portal>
        <Toast.Viewport
          aria-label={messages.feedback.notifications}
          className="fixed left-1/2 top-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 outline-none"
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="flex items-center gap-3 rounded-md bg-success px-4 py-3 text-sm text-success-foreground shadow-lg ring-1 ring-black/10 transition-[opacity,transform] duration-200 data-[ending-style]:-translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-2 data-[starting-style]:opacity-0"
    >
      <CheckCircleIcon width={20} height={20} className="shrink-0" />
      <Toast.Title className="flex-1 font-semibold" />
      <Toast.Close
        aria-label={messages.feedback.dismiss}
        className="rounded-sm px-1 text-base leading-none opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-foreground"
      >
        ×
      </Toast.Close>
    </Toast.Root>
  ));
}
