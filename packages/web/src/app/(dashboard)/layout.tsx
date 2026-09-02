import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";

/**
 * Server Component — no `"use client"` anywhere in this file. The
 * logout button needs no local state/interactivity of its own; it's a
 * plain `<form action={logoutAction}>`, which React/Next bind natively
 * without any client-side JavaScript. See
 * docs/architecture/milestone-8-design.md §6.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/patients" className="text-sm font-semibold">
            Epitaxy
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/patients" className="text-muted-foreground hover:text-foreground">
              Patients
            </Link>
            <Link href="/procedure-types" className="text-muted-foreground hover:text-foreground">
              Procedure types
            </Link>
            <Link href="/surgeries" className="text-muted-foreground hover:text-foreground">
              Surgeries
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
