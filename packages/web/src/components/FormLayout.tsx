import type { ReactNode } from "react";

/**
 * The narrow, centred wrapper for a single-task screen — a create/edit
 * form. Sits inside the wider dashboard workspace shell
 * (`app/(dashboard)/layout.tsx`, `max-w-[90rem]`) and pulls a focused
 * form back to a comfortable width so it reads as one thing to do (Law
 * of Prägnanz / Selective Attention). See
 * `docs/design/desktop-space-usage.md` §3 P1 — "widen workspaces, keep
 * single-task forms narrow".
 *
 * Server Component — layout only, no interactivity.
 */
export function FormLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl">{children}</div>;
}
