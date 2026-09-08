"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const sections = [
  { href: "/patients", label: "Pacientes" },
  { href: "/staff/residents", label: "Plantilla" },
  { href: "/research-studies", label: "Investigaciones" },
  { href: "/settings/procedure-types", label: "Configuración" },
] as const;

/**
 * Client leaf so the current section can be highlighted (`usePathname`)
 * — the Von Restorff / "consistent + satisfying" principle. The
 * surrounding layout stays a Server Component; only this needs the
 * client. The logout form is passed in as `children` so it keeps its
 * plain-`<form action>` Server Action binding.
 */
export function DashboardNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {sections.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-colors hover:text-foreground",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
