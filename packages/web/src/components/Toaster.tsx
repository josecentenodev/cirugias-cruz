"use client";

import { Toast } from "@base-ui/react/toast";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { FLASH_COOKIE, readFlashKey } from "@/lib/flash";
import { messages } from "@/messages/en";

/**
 * The app's single toast surface (Milestone 12, design §4) — mounted
 * once in `app/layout.tsx`. Success feedback only: errors stay inline
 * next to the form that produced them (`components/ActionForm.tsx`).
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
          className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none"
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
      className="flex items-start justify-between gap-3 rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success shadow-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
    >
      <Toast.Title className="font-medium" />
      <Toast.Close
        aria-label={messages.feedback.dismiss}
        className="rounded-sm px-1 leading-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ×
      </Toast.Close>
    </Toast.Root>
  ));
}
