"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches unexpected errors (API unreachable, timeouts, malformed
 * responses, bugs) — never the expectable ones (validation, domain
 * rejections, not-found), which are handled inline by the
 * form/page that triggered them. See
 * docs/architecture/milestone-8-design.md §7. Deliberately shows a
 * generic message — never `error.message` — since an unexpected error's
 * real detail may carry infrastructure information not meant for the
 * physician; it is logged, not displayed.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t complete that request. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
