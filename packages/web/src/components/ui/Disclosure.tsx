import type { ReactNode } from "react";

/**
 * A collapsible section built on the native `<details>`/`<summary>`
 * element — keyboard-accessible and functional before hydration, no
 * client JS. Used to fold a low-frequency form (an "add / record" form
 * on a detail screen) out of the way until it's needed
 * (`desktop-space-usage.md` §3 P3).
 *
 * `defaultOpen` only sets the initial state: when `false` the component
 * renders no `open` attribute at all, so the browser owns the toggle
 * state and a Server-Component re-render (e.g. after a validation error
 * on the nested form) never resets it.
 */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-md border border-border"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-xs transition-transform group-open:rotate-90">
          ▸
        </span>
        {summary}
      </summary>
      <div className="border-t border-border p-3">{children}</div>
    </details>
  );
}
