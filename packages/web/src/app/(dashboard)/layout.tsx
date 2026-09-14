import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { logoutAction } from "@/features/auth/actions";
import { messages } from "@/messages/en";

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
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-6 py-3">
          <Link href="/patients" className="text-sm font-semibold text-foreground">
            {messages.brand.name}
          </Link>
          <DashboardNav>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {messages.common.logOut}
              </button>
            </form>
          </DashboardNav>
        </div>
      </header>
      <main className="mx-auto max-w-[90rem] px-6 py-6">{children}</main>
    </div>
  );
}
