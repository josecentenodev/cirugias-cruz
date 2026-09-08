"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * A submit button that reflects the enclosing `<form>`'s pending state
 * (disabled + spinner + optional swapped label) via `useFormStatus`.
 * Replaces the per-form bespoke `SubmitButton` copies — the "provide
 * feedback" principle, applied consistently. Must be rendered inside a
 * `<form>`.
 */
export function PendingButton({
  children,
  pendingText,
  ...props
}: Omit<ButtonProps, "type" | "disabled"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
