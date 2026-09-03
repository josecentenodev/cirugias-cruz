import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";

/**
 * A Resident's own shell (ADR 0017) — deliberately separate from
 * `(dashboard)/layout.tsx`: a Resident's nav has exactly one
 * destination (their Surgery panel), not the Physician's full menu.
 * Same "plain `<form>`, no client JS needed" reasoning as the
 * Physician's logout button — `logoutAction` itself doesn't care which
 * kind of principal is logging out.
 */
export default function ResidentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/resident/surgeries" className="text-sm font-semibold">
            Epitaxy
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/resident/surgeries"
              className="text-muted-foreground hover:text-foreground"
            >
              My surgeries
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
