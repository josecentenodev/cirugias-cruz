import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { messages } from "@/messages/en";

// See app/(auth)/login/page.tsx for why: nonce-based CSP requires dynamic rendering.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-semibold text-muted-foreground">{messages.brand.name}</p>
      <h1 className="text-lg font-semibold">{messages.errors.notFound.title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{messages.errors.notFound.body}</p>
      <Link href="/patients" className={cn(buttonVariants())}>
        {messages.errors.notFound.home}
      </Link>
    </div>
  );
}
